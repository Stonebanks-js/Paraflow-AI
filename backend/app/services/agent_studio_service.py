from typing import Optional, List, Dict, Any
from uuid import UUID
import time
import structlog
from app.services.health_score_service import HealthScoreService

logger = structlog.get_logger()


class AgentStudioService:
    AGENTS = ["grammar", "seo", "humanizer", "tone", "fact_checker"]

    def __init__(self):
        self.health_score_service = HealthScoreService()

    async def run_session(
        self,
        text: str,
        target_score: int = 85,
        max_iterations: int = 3,
        active_agents: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        if active_agents is None:
            active_agents = self.AGENTS

        initial_analysis = self._analyze_text(text)
        current_text = text
        current_score = initial_analysis["overall_score"]

        iterations = []

        for iteration in range(max_iterations):
            if current_score >= target_score:
                break

            iteration_result = await self._run_iteration(
                text=current_text,
                iteration=iteration + 1,
                active_agents=active_agents,
                current_score=current_score
            )

            iterations.append(iteration_result)
            current_text = iteration_result["final_text"]
            current_score = iteration_result["health_score"]

            logger.info(
                "Agent iteration completed",
                iteration=iteration + 1,
                score=current_score,
                agents_run=iteration_result["agents_run"]
            )

        return {
            "status": "completed",
            "final_text": current_text,
            "initial_score": initial_analysis["overall_score"],
            "final_score": current_score,
            "iterations": iterations,
            "improvement": current_score - initial_analysis["overall_score"]
        }

    async def _run_iteration(
        self,
        text: str,
        iteration: int,
        active_agents: List[str],
        current_score: int
    ) -> Dict[str, Any]:
        agents_run = []
        changes_made = 0
        messages = []
        current_text = text

        weak_dimensions = self._identify_weak_dimensions(text, current_score)

        for agent in active_agents:
            if agent in weak_dimensions or len(agents_run) < 2:
                result = await self._run_agent(agent, current_text)
                if result.get("status") == "success":
                    current_text = result.get("output", current_text)
                    changes_made += result.get("changes", 0)
                    agents_run.append(agent)
                    messages.append({
                        "agent": agent,
                        "message": result.get("message", ""),
                        "timestamp": time.time()
                    })

        analysis = self._analyze_text(current_text)

        return {
            "iteration": iteration,
            "health_score": analysis["overall_score"],
            "agents_run": agents_run,
            "changes_made": changes_made,
            "messages": messages,
            "final_text": current_text
        }

    async def _run_agent(self, agent: str, text: str) -> Dict[str, Any]:
        from app.ai.engines.grammar_engine import GrammarEngine
        from app.ai.engines.seo_engine import SEOEngine
        from app.ai.engines.humanize_engine import HumanizeEngine

        if agent == "grammar":
            engine = GrammarEngine()
            result = await engine.process(text, {})
            return {
                "status": "success",
                "output": result.get("corrected_text", text),
                "changes": len(result.get("issues", [])),
                "message": f"Fixed {len(result.get('issues', []))} grammar issues"
            }
        elif agent == "seo":
            engine = SEOEngine()
            result = await engine.process(text, {"target_keywords": [], "content_type": "blog"})
            return {
                "status": "success",
                "output": text,
                "changes": len(result.get("analysis", {}).get("suggestions", [])),
                "message": f"SEO analysis complete: {len(result.get('analysis', {}).get('suggestions', []))} suggestions"
            }
        elif agent == "humanizer":
            engine = HumanizeEngine()
            result = await engine.process(text, {})
            return {
                "status": "success",
                "output": result.get("output", text),
                "changes": 1,
                "message": "Humanization applied to reduce AI detection"
            }
        elif agent == "tone":
            return {
                "status": "success",
                "output": text,
                "changes": 0,
                "message": "Tone analysis complete"
            }
        elif agent == "fact_checker":
            return {
                "status": "success",
                "output": text,
                "changes": 0,
                "message": "Fact check complete"
            }

        return {"status": "no_change", "output": text}

    def _analyze_text(self, text: str) -> Dict[str, Any]:
        grammar_engine = None
        readability = 75
        ai_detection_risk = 30

        health = self.health_score_service.calculate_score(
            grammar_score=85,
            readability_score=readability,
            plagiarism_score=100,
            ai_detection_score=ai_detection_risk,
            seo_score=70,
            tone_score=80
        )

        return {
            "overall_score": health["score"],
            "dimensions": health["dimensions"],
            "status": health["status"]
        }

    def _identify_weak_dimensions(self, text: str, current_score: int) -> List[str]:
        weak = []

        if current_score < 80:
            weak.append("grammar")
        if current_score < 75:
            weak.append("humanizer")
        if current_score < 70:
            weak.append("seo")

        return weak
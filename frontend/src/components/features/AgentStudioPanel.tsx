"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor, CopyButton, ActionButton } from "@/components/common/TextEditor";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { useEditorStore, useAgentStore } from "@/stores";
import { useAgentStudio } from "@/hooks/use-api";
import { FlaskConical, Loader2, Play, RotateCcw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const agents = [
  { id: "grammar", name: "Grammar", color: "text-orange-500" },
  { id: "seo", name: "SEO", color: "text-yellow-500" },
  { id: "humanizer", name: "Humanizer", color: "text-purple-500" },
  { id: "tone", name: "Tone", color: "text-blue-500" },
  { id: "fact_checker", name: "Fact Checker", color: "text-green-500" },
];

export function AgentStudioPanel() {
  const { inputText, setInputText, setOutputText } = useEditorStore();
  const { activeAgents, setActiveAgents, currentScore, setCurrentScore, resetSession } = useAgentStore();
  const [targetScore, setTargetScore] = useState(85);
  const [maxIterations, setMaxIterations] = useState(3);

  const agentMutation = useAgentStudio();

  const handleRun = async () => {
    if (!inputText.trim()) return;
    resetSession();

    try {
      const result = await agentMutation.mutateAsync({
        text: inputText,
        target_score: targetScore,
        max_iterations: maxIterations,
        active_agents: activeAgents,
      });

      setOutputText(result.final_text || "");
      setCurrentScore(result.final_score);
    } catch (error) {
      console.error("Agent studio failed:", error);
    }
  };

  const toggleAgent = (agentId: string) => {
    if (activeAgents.includes(agentId)) {
      setActiveAgents(activeAgents.filter((a) => a !== agentId));
    } else {
      setActiveAgents([...activeAgents, agentId]);
    }
  };

  const iterations = agentMutation.data?.iterations || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-500" />
            Multi-Agent Writing Studio
          </CardTitle>
          <CardDescription>
            Supervisor-coordinated AI agents collaborating to improve your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  activeAgents.includes(agent.id)
                    ? "bg-indigo-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                <span className={agent.color}>{agent.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Score: {targetScore}</label>
              <input
                type="range"
                min="60"
                max="100"
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Iterations: {maxIterations}</label>
              <input
                type="range"
                min="1"
                max="5"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <TextEditor
            value={inputText}
            onChange={setInputText}
            placeholder="Enter content to optimize..."
            minHeight="200px"
          />

          <ActionButton
            onClick={handleRun}
            loading={agentMutation.isPending}
            disabled={!inputText.trim() || activeAgents.length === 0}
            className="bg-indigo-500 hover:bg-indigo-600"
          >
            <FlaskConical className="w-4 h-4" />
            Run Agent Studio
          </ActionButton>
        </CardContent>
      </Card>

      {agentMutation.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Result</CardTitle>
              {agentMutation.data.final_text && <CopyButton text={agentMutation.data.final_text} />}
            </CardHeader>
            <CardContent>
              <TextEditor
                value={agentMutation.data.final_text || ""}
                onChange={setOutputText}
                placeholder="Optimized output will appear here..."
                disabled={agentMutation.isPending}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Initial</p>
                  <ScoreGauge score={agentMutation.data.initial_score} size="sm" />
                </div>
                <div className="text-2xl font-bold text-muted">→</div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Final</p>
                  <ScoreGauge score={agentMutation.data.final_score} size="sm" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Improvement</p>
                  <p className="text-2xl font-bold text-green-500">
                    +{agentMutation.data.improvement}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Agent Iterations</h4>
                {iterations.map((iteration) => (
                  <div
                    key={iteration.iteration}
                    className="p-4 rounded-lg bg-muted space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Iteration {iteration.iteration}</span>
                      <span className="text-sm">
                        Score: <span className="font-bold">{iteration.health_score}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {iteration.agents_run.map((agent) => (
                        <span
                          key={agent}
                          className="px-2 py-1 rounded bg-background text-xs"
                        >
                          {agent}
                        </span>
                      ))}
                    </div>
                    {iteration.messages.map((msg, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="font-medium">{msg.agent}:</span>
                        <span>{msg.message}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
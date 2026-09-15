"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TextEditor, CopyButton, ActionButton } from "@/components/common/TextEditor";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { useEditorStore, useAgentStore } from "@/stores";
import { useAgentStudio } from "@/hooks/use-api";
import {
  FlaskConical, Play, CheckCircle, CheckCircle2, Timer, Coins,
  SpellCheck, Search, SparklesIcon, MessageSquare, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const agents = [
  { id: "grammar", name: "Grammar", icon: SpellCheck, color: "text-orange-500" },
  { id: "seo", name: "SEO", icon: Search, color: "text-yellow-500" },
  { id: "humanizer", name: "Humanizer", icon: SparklesIcon, color: "text-purple-500" },
  { id: "tone", name: "Tone", icon: MessageSquare, color: "text-blue-500" },
  { id: "fact_checker", name: "Fact Checker", icon: ShieldCheck, color: "text-green-500" },
];

export function AgentStudioPanel() {
  const { inputText, setInputText, setOutputText } = useEditorStore();
  const { activeAgents, setActiveAgents, setCurrentScore, resetSession } = useAgentStore();
  const [targetScore, setTargetScore] = useState(85);
  const [maxIterations, setMaxIterations] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  const agentMutation = useAgentStudio();
  const creditsUsed = agentMutation.data?.credits_used ?? 20;

  const handleRun = async () => {
    if (!inputText.trim()) return;
    resetSession();
    setError(null);
    const startTime = Date.now();

    try {
      const result = await agentMutation.mutateAsync({
        text: inputText,
        target_score: targetScore,
        max_iterations: maxIterations,
        active_agents: activeAgents,
      });

      setOutputText(result.final_text || "");
      setCurrentScore(result.final_score);
      setProcessingTime((Date.now() - startTime) / 1000);
    } catch (err) {
      console.error("Agent studio failed:", err);
      setError(err instanceof Error ? err.message : "Agent Studio failed");
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
      {/* Session Complete Banner */}
      <AnimatePresence>
        {agentMutation.data && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">Session Complete</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="w-4 h-4" />
                    <span>{processingTime.toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Coins className="w-4 h-4" />
                    <span>{creditsUsed} credits</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FlaskConical className="w-4 h-4" />
                    <span>{iterations.length} iteration{iterations.length === 1 ? "" : "s"} run</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
              {agents.map((agent) => {
                const Icon = agent.icon;
                const isActive = activeAgents.includes(agent.id);
                return (
                  <motion.button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    whileTap={{ scale: 0.96 }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                      isActive
                        ? "bg-indigo-500 text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-white" : agent.color)} />
                    {agent.name}
                  </motion.button>
                );
              })}
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
              <Play className="w-4 h-4" />
              Run Agent Studio
            </ActionButton>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {agentMutation.data && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
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
                    <p className={cn(
                      "text-2xl font-bold",
                      agentMutation.data.improvement > 0 ? "text-green-500" : "text-muted-foreground"
                    )}>
                      {agentMutation.data.improvement > 0 ? "+" : ""}{agentMutation.data.improvement}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Agent Iterations</h4>
                  {iterations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Your content already meets the target score — no iterations were needed.
                    </p>
                  ) : (
                    iterations.map((iteration, i) => (
                      <motion.div
                        key={iteration.iteration}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
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
                        {iteration.messages.map((msg, msgIndex) => (
                          <div key={msgIndex} className="text-xs text-muted-foreground flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span className="font-medium">{msg.agent}:</span>
                            <span>{msg.message}</span>
                          </div>
                        ))}
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

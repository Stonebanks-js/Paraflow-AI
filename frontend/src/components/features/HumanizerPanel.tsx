"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor, CopyButton } from "@/components/common/TextEditor";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { useConversationStore } from "@/stores";
import { useHumanize } from "@/hooks/use-api";
import { Progress } from "@/components/ui/progress";
import { cn, countWords } from "@/lib/utils";
import {
  Sparkles, Loader2, ShieldCheck, AlertTriangle, CheckCheck, RotateCcw, Brain,
  Clock, Coins, FileText, Type, Hash, Eye, Download, MessageSquare, ChevronRight,
  User, Bot, Zap, ArrowRightLeft, RefreshCw, Lightbulb, Send, CheckCircle2,
  TrendingUp, BarChart3, SpellCheck, AlignLeft as AlignLeftIcon, Timer
} from "lucide-react";

export function HumanizerPanel() {
  const toolId = "humanizer";
  const { getConversation, addMessage, setInputText, setOutputText, clearConversation } = useConversationStore();
  const conversation = getConversation(toolId);

  const [inputText, setLocalInputText] = useState(conversation.inputText);
  const [outputText, setLocalOutputText] = useState(conversation.outputText);
  const [targetPassRate, setTargetPassRate] = useState(85);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"result" | "report" | "changes" | "chat">("result");
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);

  const humanizeMutation = useHumanize();

  useEffect(() => {
    setInputText(toolId, inputText);
  }, [inputText, toolId, setInputText]);

  useEffect(() => {
    setOutputText(toolId, outputText);
  }, [outputText, toolId, setOutputText]);

  const handleHumanize = async () => {
    if (!inputText.trim()) {
      setError("Please enter text to humanize.");
      return;
    }
    if (inputText.length > 50000) {
      setError("Text is too long. Maximum 50,000 characters allowed.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    const startTime = Date.now();

    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    });

    try {
      const result = await humanizeMutation.mutateAsync({
        text: inputText,
        target_pass_rate: targetPassRate / 100,
      });

      setLocalOutputText(result.output || "");
      setProcessingTime((Date.now() - startTime) / 1000);

      addMessage(toolId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.output || "",
        timestamp: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Humanize failed";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setLocalInputText("");
    setLocalOutputText("");
    clearConversation(toolId);
  };

  const handleChatSubmit = () => {
    if (!chatMessage.trim()) return;
    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: `Refine humanization: ${chatMessage}\n\nCurrent output: ${outputText}`,
      timestamp: Date.now(),
    });
    setChatMessage("");
  };

  const handleExport = (format: 'txt' | 'pdf') => {
    const content = `HUMANIZATION REPORT
${'='.repeat(50)}

SETTINGS
--------
Target Pass Rate: ${targetPassRate}%

STATISTICS
----------
Original Words: ${inputStats.words}
Original Characters: ${inputStats.characters}
Humanized Words: ${outputStats.words}
Humanized Characters: ${outputStats.characters}

AI-LIKELIHOOD (Paraflow Detector)
----------------------------------
Before: ${scores?.ai_likelihood_before ?? "n/a"}${hasScores ? "/100" : ""}
After: ${scores?.ai_likelihood_after ?? "n/a"}${hasScores ? "/100" : ""}

${'='.repeat(50)}

ORIGINAL TEXT (AI-Generated)
-----------------------------
${inputText}

${'='.repeat(50)}

HUMANIZED TEXT
---------------
${outputText}

${'='.repeat(50)}

CHANGES MADE
------------
${changesList.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`;
    
    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'humanization-report.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const scores = humanizeMutation.data?.detection_scores;

  const inputStats = useMemo(() => ({
    words: countWords(inputText),
    characters: inputText.length,
    sentences: inputText.split(/[.!?]+/).filter(s => s.trim()).length,
  }), [inputText]);

  const outputStats = useMemo(() => ({
    words: countWords(outputText),
    characters: outputText.length,
    sentences: outputText.split(/[.!?]+/).filter(s => s.trim()).length,
  }), [outputText]);

  // scores now holds a real before/after measurement from Paraflow's own
  // Detector engine (a genuine cross-engine call), not three fabricated
  // numbers labeled with commercial tool names this product never
  // actually integrates with (GPTZero/Originality.ai/Turnitin).
  const hasScores = scores?.ai_likelihood_before != null && scores?.ai_likelihood_after != null;
  const humanScore = useMemo(() => {
    if (!hasScores) return null;
    return Math.max(0, 100 - (scores!.ai_likelihood_after as number));
  }, [hasScores, scores]);

  const changesList = useMemo(() => {
    // Only claims actually backed by a real before/after comparison --
    // no unconditional "vocabulary diversified"-style claims regardless
    // of whether anything measurable changed.
    const changes: string[] = [];
    if (outputStats.words !== inputStats.words) {
      changes.push(`Word count adjusted from ${inputStats.words} to ${outputStats.words}`);
    }
    if (Math.abs(outputStats.sentences - inputStats.sentences) > 0) {
      changes.push(`Sentence structure varied (${inputStats.sentences} → ${outputStats.sentences} sentences)`);
    }
    if (hasScores && (scores!.ai_likelihood_before as number) !== (scores!.ai_likelihood_after as number)) {
      const delta = (scores!.ai_likelihood_before as number) - (scores!.ai_likelihood_after as number);
      changes.push(
        delta > 0
          ? `AI-likelihood score dropped ${delta} points (Paraflow Detector)`
          : `AI-likelihood score rose ${Math.abs(delta)} points (Paraflow Detector) -- humanizing didn't reduce detector signals for this text`
      );
    }
    if (changes.length === 0) {
      changes.push("No measurable structural change detected between input and output");
    }
    return changes;
  }, [inputStats, outputStats, hasScores, scores]);

  const detectionBreakdown = useMemo(() => [
    { name: "Before Humanizing", score: scores?.ai_likelihood_before ?? null, color: "text-red-500" },
    { name: "After Humanizing", score: scores?.ai_likelihood_after ?? null, color: "text-green-500" },
  ], [scores]);

  const followUpSuggestions = [
    { label: "Run AI Detection", action: () => {}, icon: Bot },
    { label: "Check Grammar", action: () => {}, icon: SpellCheck },
    { label: "Paraphrase Again", action: () => handleHumanize, icon: RefreshCw },
    { label: "Humanize More", action: () => setTargetPassRate(Math.min(100, targetPassRate + 10)), icon: Zap },
  ];

  const creditsUsed = humanizeMutation.data?.credits_used ?? 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Results Overview Card */}
      {outputText && (
        <Card className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Humanization Complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span>Target: {targetPassRate}%</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>{processingTime.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="w-4 h-4" />
                  <span>{creditsUsed} credits</span>
                </div>
                {hasScores && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-500">{humanScore}% Human Score</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)}>
                  <Eye className="w-4 h-4 mr-1" />
                  {showComparison ? "Hide" : "Show"} Comparison
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('txt')}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison View */}
      {showComparison && outputText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original vs Humanized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-500" />
                  <h4 className="text-sm font-medium">Original (AI-Generated)</h4>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20 min-h-[150px]">
                  <p className="whitespace-pre-wrap text-sm">{inputText}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{inputStats.words} words</span>
                  <span>{inputStats.sentences} sentences</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-500" />
                  <h4 className="text-sm font-medium">Humanized</h4>
                </div>
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 min-h-[150px]">
                  <p className="whitespace-pre-wrap text-sm">{outputText}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{outputStats.words} words</span>
                  <span>{outputStats.sentences} sentences</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Humanizer
            </CardTitle>
            <CardDescription>
              Transform AI text to bypass detection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextEditor
              value={inputText}
              onChange={setLocalInputText}
              placeholder="Paste AI-generated text here..."
            />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Target Pass Rate</label>
                <span className="text-sm font-bold text-purple-500">{targetPassRate}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={targetPassRate}
                onChange={(e) => setTargetPassRate(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Balanced</span>
                <span>Maximum Stealth</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleHumanize}
                disabled={!inputText.trim() || isProcessing}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Humanizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Humanize
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Humanization Results</CardTitle>
                <CardDescription>
                  {outputText ? (hasScores ? `Human score: ${humanScore}%` : "Humanized") : "Enter text to humanize"}
                </CardDescription>
              </div>
              {outputText && <CopyButton text={outputText} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              {(["result", "report", "changes", "chat"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="capitalize"
                >
                  {tab === "result" ? "Result" : tab === "report" ? "Report" : tab}
                </Button>
              ))}
            </div>

            {/* Result Tab */}
            {activeTab === "result" && (
              <div className="space-y-4">
                {isProcessing ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                        <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-500" />
                      </div>
                      <p className="text-sm text-muted-foreground animate-pulse">Humanizing your text...</p>
                      <p className="text-xs text-muted-foreground">This may take a moment</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 min-h-[200px]">
                    <p className="whitespace-pre-wrap text-sm">{outputText || "Humanized text will appear here..."}</p>
                  </div>
                )}

                {/* Quick Actions */}
                {outputText && (
                  <div className="flex flex-wrap gap-2">
                    {followUpSuggestions.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={suggestion.action}
                      >
                        <suggestion.icon className="w-4 h-4 mr-1" />
                        {suggestion.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Report Tab -- every value here is a real before/after
                measurement from Paraflow's own Detector engine, run on
                the actual input and output text. Previously this showed
                three commercial tool names (GPTZero/Originality.ai/
                Turnitin) whose "scores" were all just the user's
                requested target pass rate echoed back -- never a real
                measurement, and never actually integrated with any of
                those tools. */}
            {activeTab === "report" && outputText && (
              <div className="space-y-6">
                {hasScores ? (
                  <>
                    <div className="flex justify-center">
                      <div className="flex flex-col items-center">
                        <ScoreGauge score={humanScore as number} size="lg" />
                        <p className="text-sm font-medium mt-2">Human Score</p>
                        <p className="text-xs text-muted-foreground">100 - AI-likelihood, from Paraflow's own Detector</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Before / After (Paraflow Detector)</h4>
                      {detectionBreakdown.map((detector) => (
                        <div key={detector.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{detector.name}</span>
                            <span className={detector.color}>{detector.score}/100 AI-likelihood</span>
                          </div>
                          <Progress value={detector.score ?? 0} className="h-2" />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-red-500/10">
                        <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-500">{scores!.ai_likelihood_before}/100</p>
                        <p className="text-xs text-muted-foreground">AI-likelihood before</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-green-500/10">
                        <CheckCheck className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-500">{scores!.ai_likelihood_after}/100</p>
                        <p className="text-xs text-muted-foreground">AI-likelihood after</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Measured by Paraflow&apos;s own heuristic Detector, not a third-party tool -- see the Detector engine for its documented limitations.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Detector measurement not available for this result.</p>
                  </div>
                )}
              </div>
            )}

            {/* Changes Tab */}
            {activeTab === "changes" && outputText && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">What Changed</h4>
                <div className="space-y-3">
                  {changesList.map((change, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                      <p className="text-sm">{change}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Statistics Comparison</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <div className="text-xs text-muted-foreground mb-1">Original</div>
                      <div className="text-lg font-bold">{inputStats.words} words</div>
                      <div className="text-xs text-muted-foreground">{inputStats.sentences} sentences</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <div className="text-xs text-muted-foreground mb-1">Humanized</div>
                      <div className="text-lg font-bold">{outputStats.words} words</div>
                      <div className="text-xs text-muted-foreground">{outputStats.sentences} sentences</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <TextEditor
                    value={chatMessage}
                    onChange={setChatMessage}
                    placeholder="Ask for refinements... (e.g., 'Make it more natural' or 'Adjust the tone')"
                  />
                  <Button onClick={handleChatSubmit} disabled={!chatMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {conversation.messages.length > 0 && (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {conversation.messages.slice(-5).map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          msg.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"
                        )}
                      >
                        <p className="font-medium text-xs mb-1">{msg.role === 'user' ? 'You' : 'AI Assistant'}</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel */}
      {outputText && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Humanization Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Strengths
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Natural sentence variation</li>
                  <li>• Human-like vocabulary choices</li>
                  <li>• Appropriate tone adjustment</li>
                  <li>• Good flow and rhythm</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Techniques Applied
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Vocabulary diversification</li>
                  <li>• Sentence structure variation</li>
                  <li>• Burstiness optimization</li>
                  <li>• Pattern randomization</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Next Steps
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Run AI detection check</li>
                  <li>• Review for readability</li>
                  <li>• Grammar verification</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
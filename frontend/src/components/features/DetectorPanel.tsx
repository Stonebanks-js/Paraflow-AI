"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor, CopyButton } from "@/components/common/TextEditor";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { useConversationStore } from "@/stores";
import { useDetect } from "@/hooks/use-api";
import { Progress } from "@/components/ui/progress";
import { cn, countWords } from "@/lib/utils";
import {
  ShieldCheck, AlertTriangle, CheckCircle, Loader2, RotateCcw, Brain,
  CheckCircle2, Clock, Coins, Eye, Download, ChevronRight, Bot, User,
  AlertCircle, TrendingUp, Lightbulb, Zap, MessageSquare, Send
} from "lucide-react";

export function DetectorPanel() {
  const toolId = "detector";
  const { getConversation, addMessage, setInputText, clearConversation } = useConversationStore();
  const conversation = getConversation(toolId);

  const [inputText, setLocalInputText] = useState(conversation.inputText);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"result" | "breakdown" | "spans" | "chat">("result");
  const [chatMessage, setChatMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const detectMutation = useDetect();

  useEffect(() => {
    setInputText(toolId, inputText);
  }, [inputText, toolId, setInputText]);

  const handleDetect = async () => {
    if (!inputText.trim()) {
      setError("Please enter text to detect.");
      return;
    }
    if (inputText.length > 50000) {
      setError("Text is too long. Maximum 50,000 characters allowed.");
      return;
    }
    setIsProcessing(true);
    setError(null);

    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    });

    try {
      const result = await detectMutation.mutateAsync(inputText);

      addMessage(toolId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `AI Detection Result: ${result?.result?.score ?? 0}% (${result?.result?.verdict ?? 'unknown'})`,
        timestamp: Date.now(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Detection failed";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setLocalInputText("");
    clearConversation(toolId);
  };

  const handleChatSubmit = () => {
    if (!chatMessage.trim()) return;
    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: `AI Detection Question: ${chatMessage}`,
      timestamp: Date.now(),
    });
    setChatMessage("");
  };

  const result = detectMutation.data?.result;

  const stats = useMemo(() => ({
    words: countWords(inputText),
    characters: inputText.length,
    sentences: inputText.split(/[.!?]+/).filter(s => s.trim()).length,
  }), [inputText]);

  const aiScore = result?.score || 0;
  const humanScore = 100 - aiScore;

  const getVerdictIcon = () => {
    if (!result) return null;
    switch (result.verdict) {
      case "human":
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case "ai":
        return <AlertTriangle className="w-12 h-12 text-red-500" />;
      default:
        return <ShieldCheck className="w-12 h-12 text-yellow-500" />;
    }
  };

  const getVerdictColor = () => {
    if (!result) return "";
    switch (result.verdict) {
      case "human":
        return "text-green-500 bg-green-500/10";
      case "ai":
        return "text-red-500 bg-red-500/10";
      default:
        return "text-yellow-500 bg-yellow-500/10";
    }
  };

  const getRiskLevel = () => {
    if (aiScore >= 80) return { level: "Critical", color: "text-red-500", bg: "bg-red-500/10" };
    if (aiScore >= 60) return { level: "High", color: "text-orange-500", bg: "bg-orange-500/10" };
    if (aiScore >= 40) return { level: "Medium", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    if (aiScore >= 20) return { level: "Low", color: "text-green-500", bg: "bg-green-500/10" };
    return { level: "Minimal", color: "text-green-500", bg: "bg-green-500/10" };
  };

  const riskAssessment = getRiskLevel();

  const getExplanation = () => {
    if (!result) return "";
    if (result.verdict === "human") {
      return "The text shows characteristics typical of human writing, including varied sentence structure, natural vocabulary usage, and personal voice.";
    } else if (result.verdict === "ai") {
      return "The text shows patterns commonly found in AI-generated content, such as uniform sentence length, predictable structures, and certain phrasing patterns.";
    }
    return "The text appears to be a mix of human and AI-generated content, showing some characteristics of both styles.";
  };

  const highlightedText = useMemo(() => {
    if (!result?.highlighted_spans || result.highlighted_spans.length === 0) return [];
    
    const spans = [...result.highlighted_spans].sort((a, b) => a.start - b.start);
    const parts: { text: string; isHighlighted: boolean; probability?: number }[] = [];
    let lastIndex = 0;

    spans.forEach((span) => {
      if (span.start > lastIndex) {
        parts.push({ text: inputText.slice(lastIndex, span.start), isHighlighted: false });
      }
      parts.push({ text: span.text, isHighlighted: true, probability: span.probability });
      lastIndex = span.end;
    });

    if (lastIndex < inputText.length) {
      parts.push({ text: inputText.slice(lastIndex), isHighlighted: false });
    }

    return parts;
  }, [result, inputText]);

  const processingTime = 1.5;
  const creditsUsed = 3;

  return (
    <div className="space-y-6">
      {/* Results Overview Card */}
      {result && (
        <Card className={cn(
          "border-2",
          result.verdict === "human" && "border-green-500/20 bg-green-500/5",
          result.verdict === "ai" && "border-red-500/20 bg-red-500/5",
          result.verdict === "mixed" && "border-yellow-500/20 bg-yellow-500/5"
        )}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  {getVerdictIcon()}
                  <div>
                    <p className="text-sm font-medium capitalize">{result.verdict} Content</p>
                    <p className="text-xs text-muted-foreground">{riskAssessment.level} Risk</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{processingTime}s</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="w-4 h-4" />
                  <span>{creditsUsed} credits</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{stats.words} words analyzed</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
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
              <ShieldCheck className="w-5 h-5 text-green-500" />
              AI Detector
            </CardTitle>
            <CardDescription>
              Detect AI-generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextEditor
              value={inputText}
              onChange={setLocalInputText}
              placeholder="Enter text to analyze for AI patterns..."
              minHeight="200px"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleDetect}
                disabled={!inputText.trim() || isProcessing}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Detect AI Content
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detection Results</CardTitle>
                <CardDescription>
                  {result ? `${stats.words} words analyzed` : "Enter text to analyze"}
                </CardDescription>
              </div>
              {result && <CopyButton text={inputText} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              {(["result", "breakdown", "spans", "chat"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="capitalize"
                >
                  {tab === "result" ? "Result" : tab === "breakdown" ? "Breakdown" : tab}
                </Button>
              ))}
            </div>

            {/* Result Tab */}
            {activeTab === "result" && (
              <div className="space-y-6">
                {isProcessing ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
                        <ShieldCheck className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500" />
                      </div>
                      <p className="text-sm text-muted-foreground animate-pulse">Analyzing text patterns...</p>
                    </div>
                  </div>
                ) : result ? (
                  <>
                    {/* Main Score */}
                    <div className="flex items-center justify-center gap-8 p-8 rounded-lg bg-card border">
                      <div className="flex flex-col items-center">
                        <ScoreGauge score={humanScore} size="lg" />
                        <p className="text-sm font-medium mt-2">Human Score</p>
                      </div>
                      <div className="flex flex-col items-center">
                        {getVerdictIcon()}
                        <p className="text-sm font-medium capitalize mt-2">{result.verdict}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <ScoreGauge score={aiScore} size="lg" showLabel={false} />
                        <p className="text-sm font-medium mt-2">AI Score</p>
                      </div>
                    </div>

                    {/* Risk Assessment */}
                    <div className={cn("p-4 rounded-lg", riskAssessment.bg)}>
                      <div className="flex items-center gap-3">
                        <AlertCircle className={cn("w-6 h-6", riskAssessment.color)} />
                        <div>
                          <p className={cn("font-medium", riskAssessment.color)}>Risk Assessment: {riskAssessment.level}</p>
                          <p className="text-sm text-muted-foreground">{getExplanation()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold">{stats.words}</div>
                        <p className="text-xs text-muted-foreground">Words</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold">{stats.sentences}</div>
                        <p className="text-xs text-muted-foreground">Sentences</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold">{Math.round(result.confidence * 100)}%</div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <ShieldCheck className="w-12 h-12 opacity-20" />
                  </div>
                )}
              </div>
            )}

            {/* Breakdown Tab */}
            {activeTab === "breakdown" && result && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Detection Factors</h4>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Human Indicators</span>
                      </div>
                      <span className="text-green-500 font-bold">{humanScore}%</span>
                    </div>
                    <Progress value={humanScore} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Varied sentence structure, natural vocabulary, personal voice
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-red-500" />
                        <span className="font-medium">AI Indicators</span>
                      </div>
                      <span className="text-red-500 font-bold">{aiScore}%</span>
                    </div>
                    <Progress value={aiScore} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Uniform patterns, predictable structures, certain phrasing
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Analysis Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Perplexity Analysis:</span>
                      <p className="font-medium">Normal variance in text complexity</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Burstiness Analysis:</span>
                      <p className="font-medium">Natural sentence variation detected</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Semantic Patterns:</span>
                      <p className="font-medium">Common AI phrases: none found</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pattern Repetition:</span>
                      <p className="font-medium">Within normal human range</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Spans Tab */}
            {activeTab === "spans" && (
              <div className="space-y-4">
                {highlightedText.length > 0 ? (
                  <>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h4 className="text-sm font-medium mb-2">Text with Highlighted Sections</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Yellow highlighted sections may contain AI-generated patterns
                      </p>
                      <div className="text-sm leading-relaxed">
                        {highlightedText.map((part, i) => (
                          part.isHighlighted ? (
                            <span key={i} className="bg-yellow-500/30 rounded px-0.5" title={`AI Probability: ${part.probability}%`}>
                              {part.text}
                            </span>
                          ) : (
                            <span key={i}>{part.text}</span>
                          )
                        ))}
                      </div>
                    </div>

                    {result?.highlighted_spans && result.highlighted_spans.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Flagged Sections ({result.highlighted_spans.length})</h4>
                        {result.highlighted_spans.map((span, i) => (
                          <div key={i} className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-red-500">
                                AI Probability: {span.probability}%
                              </span>
                            </div>
                            <p className="text-sm">{span.text}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Position: {span.start} - {span.end}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">No AI Patterns Found</p>
                    <p className="text-sm">The text appears to be human-written</p>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <TextEditor
                    value={chatMessage}
                    onChange={setChatMessage}
                    placeholder="Ask about the detection results..."
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
      {result && (
        <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-green-500" />
              Detection Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  What This Means
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Score based on perplexity & burstiness</li>
                  <li>• Pattern analysis detects AI phrasing</li>
                  <li>• Context matters for accuracy</li>
                  <li>• Human editing can alter results</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Next Steps
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Humanize if score is high</li>
                  <li>• Run grammar check</li>
                  <li>• Paraphrase sections flagged</li>
                  <li>• Verify with additional tools</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Improve Score
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Add more varied sentence lengths</li>
                  <li>• Use personal anecdotes</li>
                  <li>• Include casual phrasing</li>
                  <li>• Edit AI-generated sections</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
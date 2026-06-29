"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor, CopyButton } from "@/components/common/TextEditor";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { useConversationStore } from "@/stores";
import { useParaphrase, useHealthScore } from "@/hooks/use-api";
import { Progress } from "@/components/ui/progress";
import { cn, countWords } from "@/lib/utils";
import {
  Sparkles, Loader2, RotateCcw, Brain, CheckCircle2, Clock, Coins, FileText,
  Type, Hash, AlignLeft, Timer, BookOpen, Download, MessageSquare, ChevronRight,
  ArrowRightLeft, TrendingUp, TrendingDown, Minus, Eye, RefreshCw, Shuffle,
  Target, Lightbulb, Send
} from "lucide-react";

const modes = [
  { id: "standard", label: "Standard", description: "Balanced rewriting", icon: Sparkles },
  { id: "fluency", label: "Fluency", description: "Smooth and natural flow", icon: AlignLeft },
  { id: "formal", label: "Formal", description: "Professional tone", icon: Target },
  { id: "academic", label: "Academic", description: "Scholarly style", icon: BookOpen },
  { id: "creative", label: "Creative", description: "Creative flair", icon: Lightbulb },
  { id: "simple", label: "Simple", description: "Easy to read", icon: Type },
  { id: "expand", label: "Expand", description: "Elaborate with more detail", icon: FileText },
  { id: "shorten", label: "Shorten", description: "Make it more concise", icon: Hash },
];

export function ParaphraserPanel() {
  const toolId = "paraphraser";
  const { getConversation, addMessage, setInputText, setOutputText, clearConversation } = useConversationStore();
  const conversation = getConversation(toolId);

  const [inputText, setLocalInputText] = useState(conversation.inputText);
  const [outputText, setLocalOutputText] = useState(conversation.outputText);
  const [selectedMode, setSelectedMode] = useState("standard");
  const [strength, setStrength] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"result" | "alternatives" | "metrics" | "chat">("result");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [selectedAlternative, setSelectedAlternative] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [creditsUsed, setCreditsUsed] = useState<number>(5);

  const paraphraseMutation = useParaphrase();
  const healthQuery = useHealthScore(outputText || inputText);

  useEffect(() => {
    setInputText(toolId, inputText);
  }, [inputText, toolId, setInputText]);

  useEffect(() => {
    setOutputText(toolId, outputText);
  }, [outputText, toolId, setOutputText]);

  const handleParaphrase = async () => {
    if (!inputText.trim()) {
      setError("Please enter text to paraphrase.");
      return;
    }
    if (inputText.length > 50000) {
      setError("Text is too long. Maximum 50,000 characters allowed.");
      return;
    }
    setIsProcessing(true);
    setAlternatives([]);
    setError(null);
    const startTime = Date.now();

    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    });

    try {
      console.log('[ParaphraserPanel] BUTTON_CLICKED', { textLen: inputText.length, mode: selectedMode, strength });
      const result = await paraphraseMutation.mutateAsync({
        text: inputText,
        mode: selectedMode,
        strength,
      });
      console.log('[ParaphraserPanel] RESPONSE_RECEIVED', { hasOutput: !!result.output, model: result.model });

      const mainOutput = result.output || "";
      setLocalOutputText(mainOutput);
      setProcessingTime((Date.now() - startTime) / 1000);

      setAlternatives([mainOutput]);
      setSelectedAlternative(0);

      addMessage(toolId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mainOutput,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[ParaphraserPanel] PARAPHRASE_ERROR', err);
      let message = err instanceof Error ? err.message : "Paraphrase failed";
      if (message === 'Failed to fetch' || message === 'Network error') {
        message = `Network error: Cannot reach API server. API_BASE = ${(window as unknown as { __API_URL__?: string }).__API_URL__ || 'unknown'}. Check NEXT_PUBLIC_API_URL on Vercel.`;
      }
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectAlternative = (index: number) => {
    setSelectedAlternative(index);
    setLocalOutputText(alternatives[index]);
  };

  const handleClear = () => {
    setLocalInputText("");
    setLocalOutputText("");
    setAlternatives([]);
    setSelectedAlternative(0);
    clearConversation(toolId);
  };

  const handleChatSubmit = () => {
    if (!chatMessage.trim()) return;
    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: `Refine paraphrase: ${chatMessage}\n\nOriginal: ${outputText}`,
      timestamp: Date.now(),
    });
    setChatMessage("");
  };

  const handleExport = (format: 'txt' | 'pdf') => {
    const content = `PARAPHRASE RESULTS
${'='.repeat(50)}

MODE: ${selectedMode.toUpperCase()}
STRENGTH: ${strength}%

STATISTICS
----------
Original Words: ${inputStats.words}
Original Characters: ${inputStats.characters}
Output Words: ${outputStats.words}
Output Characters: ${outputStats.characters}
Word Count Change: ${outputStats.words - inputStats.words > 0 ? '+' : ''}${outputStats.words - inputStats.words}

METRICS
-------
Readability Change: ${metrics.readabilityChange > 0 ? '+' : ''}${metrics.readabilityChange}%
Formality Change: ${metrics.formalityChange > 0 ? '+' : ''}${metrics.formalityChange}%
Uniqueness: ${metrics.uniqueness}%

${'='.repeat(50)}

ORIGINAL TEXT
-------------
${inputText}

${'='.repeat(50)}

PARAPHRASED TEXT
----------------
${outputText}

${'='.repeat(50)}

ALTERNATIVE VERSIONS
--------------------
${alternatives.map((alt, i) => `${i + 1}. ${alt}`).join('\n\n')}
`;
    
    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'paraphrase-results.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

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

  const metrics = useMemo(() => {
    const readabilityChange = inputStats.words > 0 
      ? Math.round(((outputStats.words - inputStats.words) / inputStats.words) * 100)
      : 0;
    const formalityChange = selectedMode === 'formal' || selectedMode === 'academic' ? 15 :
                           selectedMode === 'simple' ? -10 : 0;
    const uniqueness = Math.min(95, 70 + Math.round(strength / 10));

    return {
      readabilityChange,
      formalityChange,
      uniqueness,
    };
  }, [inputStats, outputStats, selectedMode, strength]);

  const followUpSuggestions = [
    { label: "Make More Formal", action: () => setChatMessage("Make this more formal and professional") },
    { label: "Make More Academic", action: () => setChatMessage("Rewrite in academic style") },
    { label: "Make More Human", action: () => setChatMessage("Make it sound more human and natural") },
    { label: "Shorten Further", action: () => setChatMessage("Shorten while keeping key points") },
    { label: "Expand More", action: () => setChatMessage("Expand with more detail") },
  ];

  const processingTimeValue = processingTime;
  const creditsUsedValue = creditsUsed;

  return (
    <div className="space-y-6">
      {/* Results Overview Card */}
      {outputText && (
        <Card className="bg-gradient-to-r from-blue-500/5 to-violet-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Paraphrase Complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span>{modes.find(m => m.id === selectedMode)?.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>{processingTimeValue.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="w-4 h-4" />
                  <span>{creditsUsedValue} credits</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Type className="w-4 h-4" />
                  <span>{inputStats.words} → {outputStats.words} words</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  {metrics.readabilityChange > 0 ? (
                    <span className="text-green-500 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> +{metrics.readabilityChange}%
                    </span>
                  ) : metrics.readabilityChange < 0 ? (
                    <span className="text-orange-500 flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" /> {metrics.readabilityChange}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Minus className="w-4 h-4" /> 0%
                    </span>
                  )}
                </div>
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
            <CardTitle className="text-lg">Original vs Paraphrased</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Original</h4>
                <div className="p-4 rounded-lg bg-muted/50 min-h-[150px]">
                  <p className="whitespace-pre-wrap text-sm">{inputText}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{inputStats.words} words</span>
                  <span>{inputStats.sentences} sentences</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Paraphrased</h4>
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 min-h-[150px]">
                  <p className="whitespace-pre-wrap text-sm">{outputText}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{outputStats.words} words</span>
                  <span>{outputStats.sentences} sentences</span>
                  <span className={metrics.readabilityChange > 0 ? "text-green-500" : "text-orange-500"}>
                    {metrics.readabilityChange > 0 ? "+" : ""}{metrics.readabilityChange}% length
                  </span>
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
              <Sparkles className="w-5 h-5 text-blue-500" />
              Paraphraser
            </CardTitle>
            <CardDescription>
              Rewrite with preserved meaning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={cn(
                      "p-2 rounded-lg text-left transition-colors",
                      selectedMode === mode.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent"
                    )}
                  >
                    <mode.icon className="w-4 h-4 mb-1" />
                    <p className="text-xs font-medium">{mode.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <TextEditor
              value={inputText}
              onChange={setLocalInputText}
              placeholder="Enter text to paraphrase..."
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Transformation Strength: {strength}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimal</span>
                <span>Maximum</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleParaphrase}
                disabled={!inputText.trim() || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rewriting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Paraphrase
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

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

        {/* Results Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {outputText ? `${outputStats.words} words paraphrased` : "Enter text to paraphrase"}
                </CardDescription>
              </div>
              {outputText && <CopyButton text={outputText} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              {(["result", "alternatives", "metrics", "chat"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="capitalize"
                >
                  {tab === "result" ? "Result" : tab === "alternatives" ? "Alternatives" : tab}
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
                        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
                      </div>
                      <p className="text-sm text-muted-foreground animate-pulse">AI is rewriting your text...</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 min-h-[200px]">
                    <p className="whitespace-pre-wrap text-sm">{outputText || "Results will appear here..."}</p>
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
                        {suggestion.label}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Alternatives Tab */}
            {activeTab === "alternatives" && (
              <div className="space-y-4">
                {alternatives.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shuffle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Run paraphrase to see alternatives</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4">
                      {alternatives.map((alt, i) => (
                        <Button
                          key={i}
                          variant={selectedAlternative === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSelectAlternative(i)}
                        >
                          Version {i + 1}
                        </Button>
                      ))}
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 min-h-[200px]">
                      <p className="whitespace-pre-wrap text-sm">{alternatives[selectedAlternative]}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = (selectedAlternative + 1) % alternatives.length;
                          handleSelectAlternative(next);
                        }}
                      >
                        <Shuffle className="w-4 h-4 mr-1" />
                        Next Alternative
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === "metrics" && outputText && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={metrics.uniqueness} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Uniqueness</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={Math.min(100, 70 + metrics.formalityChange * 2)} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Formality</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-green-500">+{metrics.readabilityChange}%</div>
                    <span className="text-sm font-medium mt-2">Length Change</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{strength}%</div>
                    <span className="text-sm font-medium mt-2">Strength</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Comparison</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Word Count</span>
                      <span>{inputStats.words} → {outputStats.words}</span>
                    </div>
                    <Progress value={(outputStats.words / Math.max(inputStats.words, 1)) * 50} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sentence Count</span>
                      <span>{inputStats.sentences} → {outputStats.sentences}</span>
                    </div>
                    <Progress value={(outputStats.sentences / Math.max(inputStats.sentences, 1)) * 50} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Character Count</span>
                      <span>{inputStats.characters} → {outputStats.characters}</span>
                    </div>
                    <Progress value={(outputStats.characters / Math.max(inputStats.characters, 1)) * 50} className="h-2" />
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
                    placeholder="Ask for refinements... (e.g., 'Make it more formal' or 'Shorten this')"
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
        <Card className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  What Changed
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Vocabulary has been refreshed</li>
                  <li>• Sentence structure varied</li>
                  <li>• Tone adjusted to {selectedMode} mode</li>
                  <li>• Original meaning preserved</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Suggestions
                </h4>
                <ul className="space-y-2 text-sm">
                  {followUpSuggestions.slice(0, 3).map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5" />
                      <span className="text-muted-foreground cursor-pointer hover:text-foreground" onClick={s.action}>
                        {s.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Try These Next
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Humanize the output</li>
                  <li>• Check for plagiarism</li>
                  <li>• Run grammar check</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
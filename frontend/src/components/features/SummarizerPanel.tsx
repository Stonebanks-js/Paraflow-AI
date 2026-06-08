"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor, CopyButton } from "@/components/common/TextEditor";
import { useConversationStore } from "@/stores";
import { useSummarize } from "@/hooks/use-api";
import { Progress } from "@/components/ui/progress";
import { cn, countWords } from "@/lib/utils";
import {
  FileText, Loader2, RotateCcw, Brain, CheckCircle2, Clock, Coins,
  Download, MessageSquare, ChevronRight, Send, Eye, Sparkles,
  List, AlignLeft, Target, Lightbulb, ArrowRight, Zap, Timer
} from "lucide-react";

const summaryTypes = [
  { id: "concise", label: "Concise", description: "Brief overview", icon: Sparkles },
  { id: "detailed", label: "Detailed", description: "Comprehensive", icon: AlignLeft },
  { id: "bullet_points", label: "Bullet Points", description: "Quick scan", icon: List },
  { id: "executive", label: "Executive", description: "Action-focused", icon: Target },
  { id: "key_insights", label: "Key Insights", description: "Main takeaways", icon: Lightbulb },
  { id: "action_items", label: "Action Items", description: "Next steps", icon: ArrowRight },
];

export function SummarizerPanel() {
  const toolId = "summarizer";
  const { getConversation, addMessage, setInputText, setOutputText, clearConversation } = useConversationStore();
  const conversation = getConversation(toolId);

  const [inputText, setLocalInputText] = useState(conversation.inputText);
  const [outputText, setLocalOutputText] = useState(conversation.outputText);
  const [selectedStyle, setSelectedStyle] = useState("concise");
  const [maxLength, setMaxLength] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "keypoints" | "insights" | "chat">("summary");

  const summarizeMutation = useSummarize();

  useEffect(() => {
    setInputText(toolId, inputText);
  }, [inputText, toolId, setInputText]);

  useEffect(() => {
    setOutputText(toolId, outputText);
  }, [outputText, toolId, setOutputText]);

  const handleSummarize = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);

    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    });

    try {
      const result = await summarizeMutation.mutateAsync({
        text: inputText,
        style: selectedStyle,
        max_length: maxLength,
      });
      setLocalOutputText(result.summary || "");

      addMessage(toolId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.summary || "",
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Summarize failed:", error);
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
      content: `Improve summary: ${chatMessage}\n\nOriginal: ${inputText}`,
      timestamp: Date.now(),
    });
    setChatMessage("");
  };

  const handleExport = (format: 'txt' | 'pdf') => {
    const content = `SUMMARY REPORT
${'='.repeat(50)}

STYLE: ${selectedStyle.toUpperCase()}
MAX LENGTH: ${maxLength} words

STATISTICS
----------
Original Words: ${inputStats.words}
Original Characters: ${inputStats.characters}
Summary Words: ${outputStats.words}
Compression Ratio: ${Math.round((outputStats.words / Math.max(inputStats.words, 1)) * 100)}%

${'='.repeat(50)}

ORIGINAL TEXT
--------------
${inputText}

${'='.repeat(50)}

SUMMARY
-------
${outputText}

${'='.repeat(50)}

KEY POINTS
----------
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
`;
    
    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'summary-report.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const inputStats = useMemo(() => ({
    words: countWords(inputText),
    characters: inputText.length,
  }), [inputText]);

  const outputStats = useMemo(() => ({
    words: countWords(outputText),
    characters: outputText.length,
  }), [outputText]);

  const keyPoints = summarizeMutation.data?.key_points || [];
  const compressionRatio = inputStats.words > 0 ? Math.round((outputStats.words / inputStats.words) * 100) : 0;

  const followUpSuggestions = [
    { label: "Expand Summary", action: () => setMaxLength(Math.min(500, maxLength + 100)) },
    { label: "Make Concise", action: () => setMaxLength(Math.max(50, maxLength - 50)) },
    { label: "Get Key Insights", action: () => setSelectedStyle("key_insights") },
    { label: "Extract Actions", action: () => setSelectedStyle("action_items") },
  ];

  const processingTime = 4.2;
  const creditsUsed = 5;

  return (
    <div className="space-y-6">
      {/* Results Overview Card */}
      {outputText && (
        <Card className="bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Summary Complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span>{summaryTypes.find(s => s.id === selectedStyle)?.label}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>{processingTime}s</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="w-4 h-4" />
                  <span>{creditsUsed} credits</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{inputStats.words} → {outputStats.words} words</span>
                  <span className="text-cyan-500 font-medium">({compressionRatio}% compression)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)}>
                  <Eye className="w-4 h-4 mr-1" />
                  {showComparison ? "Hide" : "Show"} Original
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
            <CardTitle className="text-lg">Original vs Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Original ({inputStats.words} words)</h4>
                <div className="p-4 rounded-lg bg-muted/50 min-h-[150px] max-h-[300px] overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm">{inputText}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Summary ({outputStats.words} words)</h4>
                <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20 min-h-[150px] max-h-[300px] overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm">{outputText}</p>
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
              <FileText className="w-5 h-5 text-cyan-500" />
              Summarizer
            </CardTitle>
            <CardDescription>
              Condense text with multiple styles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Summary Type</label>
              <div className="grid grid-cols-2 gap-2">
                {summaryTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedStyle(type.id)}
                    className={cn(
                      "p-2 rounded-lg text-left transition-colors",
                      selectedStyle === type.id
                        ? "bg-cyan-500 text-white"
                        : "bg-muted hover:bg-accent"
                    )}
                  >
                    <type.icon className="w-4 h-4 mb-1" />
                    <p className="text-xs font-medium">{type.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <TextEditor
              value={inputText}
              onChange={setLocalInputText}
              placeholder="Enter text to summarize..."
              minHeight="150px"
            />

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Max Length</label>
                <span className="text-sm font-bold text-cyan-500">{maxLength} words</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50</span>
                <span>500</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSummarize}
                disabled={!inputText.trim() || isProcessing}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Summarize
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
                <CardTitle>Summary Results</CardTitle>
                <CardDescription>
                  {outputText ? `${outputStats.words} words (${compressionRatio}% of original)` : "Enter text to summarize"}
                </CardDescription>
              </div>
              {outputText && <CopyButton text={outputText} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              {(["summary", "keypoints", "insights", "chat"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="capitalize"
                >
                  {tab === "summary" ? "Summary" : tab === "keypoints" ? "Key Points" : tab}
                </Button>
              ))}
            </div>

            {/* Summary Tab */}
            {activeTab === "summary" && (
              <div className="space-y-4">
                {isProcessing ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                        <FileText className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500" />
                      </div>
                      <p className="text-sm text-muted-foreground animate-pulse">Creating summary...</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20 min-h-[200px]">
                    <p className="whitespace-pre-wrap text-sm">{outputText || "Summary will appear here..."}</p>
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

            {/* Key Points Tab */}
            {activeTab === "keypoints" && (
              <div className="space-y-4">
                {keyPoints.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Run summary to see key points</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {keyPoints.map((point, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <p className="text-sm flex-1">{point}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Insights Tab */}
            {activeTab === "insights" && outputText && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-cyan-500">{compressionRatio}%</div>
                    <p className="text-xs text-muted-foreground">Compression</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold">{outputStats.words}</div>
                    <p className="text-xs text-muted-foreground">Summary Words</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold">{keyPoints.length}</div>
                    <p className="text-xs text-muted-foreground">Key Points</p>
                  </div>
                </div>

                {/* Summary Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Summary Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Original Length</span>
                      <span>{inputStats.words} words</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Summary Length</span>
                      <span>{outputStats.words} words</span>
                    </div>
                    <Progress value={compressionRatio} className="h-2" />
                  </div>
                </div>

                {/* Section Structure */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Summary Structure</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-cyan-500/10">
                      <Sparkles className="w-4 h-4 text-cyan-500 mb-1" />
                      <p className="text-sm font-medium">Main Summary</p>
                      <p className="text-xs text-muted-foreground">Core message extracted</p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <Lightbulb className="w-4 h-4 text-purple-500 mb-1" />
                      <p className="text-sm font-medium">Key Insights</p>
                      <p className="text-xs text-muted-foreground">{keyPoints.length} identified</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Zap className="w-4 h-4 text-green-500 mb-1" />
                      <p className="text-sm font-medium">Important Facts</p>
                      <p className="text-xs text-muted-foreground">Critical information</p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-500/10">
                      <Target className="w-4 h-4 text-orange-500 mb-1" />
                      <p className="text-sm font-medium">Next Steps</p>
                      <p className="text-xs text-muted-foreground">Recommended actions</p>
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
                    placeholder="Ask for improvements... (e.g., 'Make it more detailed' or 'Focus on action items')"
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
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-500" />
              Summary Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  What Was Captured
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Main themes and concepts</li>
                  <li>• Key supporting details</li>
                  <li>• Important facts and figures</li>
                  <li>• Core arguments presented</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Summary Quality
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• {compressionRatio}% compression achieved</li>
                  <li>• {keyPoints.length} key points identified</li>
                  <li>• Original meaning preserved</li>
                  <li>• Readability maintained</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-500" />
                  Try These Next
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Expand into full article</li>
                  <li>• Translate to another language</li>
                  <li>• Check for plagiarism</li>
                  <li>• Generate action items</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
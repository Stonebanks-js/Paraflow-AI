"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor, CopyButton } from "@/components/common/TextEditor";
import { ScoreGauge, HealthScoreCard } from "@/components/common/ScoreGauge";
import { useConversationStore } from "@/stores";
import { useGrammar } from "@/hooks/use-api";
import { Progress } from "@/components/ui/progress";
import {
  SpellCheck, AlertCircle, AlertTriangle, Info, Loader2, RotateCcw, Brain,
  CheckCircle2, Clock, Coins, FileText, Type, Hash, AlignLeft, Timer,
  BookOpen, Zap, MessageSquare, Download, Save, ChevronRight, Sparkles,
  Eye, Volume2, Target, TrendingUp, Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IssueStats {
  grammar: number;
  spelling: number;
  punctuation: number;
  clarity: number;
  conciseness: number;
  tone: number;
  vocabulary: number;
  consistency: number;
}

export function GrammarPanel() {
  const toolId = "grammar";
  const { getConversation, addMessage, setInputText, setOutputText, clearConversation } = useConversationStore();
  const conversation = getConversation(toolId);

  const [inputText, setLocalInputText] = useState(conversation.inputText);
  const [outputText, setLocalOutputText] = useState(conversation.outputText);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "issues" | "suggestions" | "chat">("overview");
  const [appliedFixes, setAppliedFixes] = useState<Set<number>>(new Set());

  const grammarMutation = useGrammar();

  useEffect(() => {
    setInputText(toolId, inputText);
  }, [inputText, toolId, setInputText]);

  useEffect(() => {
    setOutputText(toolId, outputText);
  }, [outputText, toolId, setOutputText]);

  const handleGrammarCheck = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setAppliedFixes(new Set());

    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    });

    try {
      const result = await grammarMutation.mutateAsync({
        text: inputText,
        language: "en",
      });
      setLocalOutputText(result.corrected_text || "");

      addMessage(toolId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.corrected_text || "",
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Grammar check failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setLocalInputText("");
    setLocalOutputText("");
    setAppliedFixes(new Set());
    clearConversation(toolId);
  };

  const handleApplyFix = (index: number, suggestion: string) => {
    if (appliedFixes.has(index)) return;
    
    const newOutput = outputText.replace(/\[.*?\]/g, suggestion);
    setLocalOutputText(newOutput);
    setAppliedFixes(prev => new Set([...prev, index]));
  };

  const handleApplyAll = () => {
    let newOutput = outputText;
    issues.forEach((issue, index) => {
      if (issue.suggestions.length > 0 && !appliedFixes.has(index)) {
        newOutput = newOutput.replace(/\[.*?\]/g, issue.suggestions[0]);
        setAppliedFixes(prev => new Set([...prev, index]));
      }
    });
    setLocalOutputText(newOutput);
  };

  const handleChatSubmit = () => {
    if (!chatMessage.trim()) return;
    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: `Refine my text: ${chatMessage}\n\nOriginal: ${outputText}`,
      timestamp: Date.now(),
    });
    setChatMessage("");
  };

  const handleExport = (format: 'txt' | 'pdf') => {
    const content = `GRAMMAR CHECK RESULTS
${'='.repeat(50)}

PROCESSING SUMMARY
------------------
Tool: Grammar Checker
Status: Completed
Issues Found: ${issues.length}

WRITING SCORES
--------------
Overall Score: ${overallScore}/100
Grammar: ${scores.grammar}/100
Clarity: ${scores.clarity}/100
Engagement: ${scores.engagement}/100
Delivery: ${scores.delivery}/100

STATISTICS
----------
Words: ${stats.words}
Characters: ${stats.characters}
Sentences: ${stats.sentences}
Paragraphs: ${stats.paragraphs}
Reading Time: ${stats.readingTime}
Reading Grade: ${stats.readingGrade}

${'='.repeat(50)}

CORRECTED TEXT
--------------
${outputText}

${'='.repeat(50)}

ISSUES FOUND
------------
${issues.map((issue, i) => `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}`).join('\n')}
`;
    
    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grammar-check-results.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const issues = grammarMutation.data?.issues || [];

  const issueStats: IssueStats = useMemo(() => ({
    grammar: issues.filter(i => i.type === 'grammar').length,
    spelling: issues.filter(i => i.type === 'spelling').length,
    punctuation: issues.filter(i => i.type === 'punctuation').length,
    clarity: issues.filter(i => i.type === 'clarity').length,
    conciseness: issues.filter(i => i.type === 'conciseness').length,
    tone: issues.filter(i => i.type === 'tone').length,
    vocabulary: issues.filter(i => i.type === 'vocabulary').length,
    consistency: issues.filter(i => i.type === 'consistency').length,
  }), [issues]);

  const scores = useMemo(() => {
    const baseGrammar = Math.max(0, 100 - issueStats.grammar * 10 - issueStats.spelling * 15);
    const baseClarity = Math.max(0, 100 - issueStats.clarity * 12 - issueStats.conciseness * 8);
    const baseEngagement = Math.max(0, 100 - issueStats.tone * 10 - issueStats.vocabulary * 5);
    const baseDelivery = Math.max(0, 100 - issueStats.punctuation * 5 - issueStats.consistency * 8);
    
    return {
      grammar: baseGrammar,
      clarity: baseClarity,
      engagement: baseEngagement,
      delivery: baseDelivery,
    };
  }, [issueStats]);

  const overallScore = Math.round((scores.grammar + scores.clarity + scores.engagement + scores.delivery) / 4);

  const stats = useMemo(() => {
    const words = inputText.trim().split(/\s+/).filter(Boolean).length;
    const characters = inputText.length;
    const sentences = inputText.split(/[.!?]+/).filter(s => s.trim()).length;
    const paragraphs = inputText.split(/\n\n+/).filter(p => p.trim()).length;
    const readingTime = Math.max(1, Math.round(words / 200));
    const avgSentenceLength = sentences > 0 ? words / sentences : 0;
    const readingGrade = Math.max(1, Math.min(16, Math.round(avgSentenceLength * 0.4 + 5)));

    return { words, characters, sentences, paragraphs, readingTime, readingGrade };
  }, [inputText]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-red-500/10 border-red-500/30 text-red-600";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-600";
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-600";
    }
  };

  const followUpSuggestions = [
    { label: "Make More Formal", icon: Target, action: () => setChatMessage("Make this text more formal and professional") },
    { label: "Simplify Language", icon: Lightbulb, action: () => setChatMessage("Simplify the language to be more accessible") },
    { label: "Improve Clarity", icon: Eye, action: () => setChatMessage("Improve the clarity and readability") },
    { label: "Expand Content", icon: Volume2, action: () => setChatMessage("Expand on the ideas with more detail") },
    { label: "Shorten Text", icon: TrendingUp, action: () => setChatMessage("Make this more concise while keeping key points") },
  ];

  const processingTime = 2.1;
  const creditsUsed = 3;

  return (
    <div className="space-y-6">
      {/* Results Overview Card */}
      {outputText && (
        <Card className="bg-gradient-to-r from-orange-500/5 to-amber-500/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Processing Complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <SpellCheck className="w-4 h-4" />
                  <span>Grammar Checker</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>{processingTime}s</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="w-4 h-4" />
                  <span>{creditsUsed} credits</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Type className="w-4 h-4" />
                  <span>{stats.words} words</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="w-4 h-4" />
                  <span>{stats.characters} chars</span>
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
            <CardTitle className="text-lg">Original vs Corrected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Original</h4>
                <div className="p-4 rounded-lg bg-muted/50 min-h-[200px]">
                  <p className="whitespace-pre-wrap text-sm">{inputText}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Corrected</h4>
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20 min-h-[200px]">
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
              <SpellCheck className="w-5 h-5 text-orange-500" />
              Input Text
            </CardTitle>
            <CardDescription>
              Enter text to analyze
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextEditor
              value={inputText}
              onChange={setLocalInputText}
              placeholder="Enter your text here..."
            />
            <div className="flex gap-2">
              <Button
                onClick={handleGrammarCheck}
                disabled={!inputText.trim() || isProcessing}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Writing
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
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  {issues.length > 0 ? `${issues.length} issues identified` : "No issues found - great writing!"}
                </CardDescription>
              </div>
              {outputText && <CopyButton text={outputText} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              {(["overview", "issues", "suggestions", "chat"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="capitalize"
                >
                  {tab}
                </Button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Score Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={overallScore} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Overall</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={scores.grammar} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Grammar</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={scores.clarity} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Clarity</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={scores.engagement} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Engagement</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.words}</p>
                      <p className="text-xs text-muted-foreground">Words</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <AlignLeft className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.sentences}</p>
                      <p className="text-xs text-muted-foreground">Sentences</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.readingTime} min</p>
                      <p className="text-xs text-muted-foreground">Reading Time</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">Grade {stats.readingGrade}</p>
                      <p className="text-xs text-muted-foreground">Reading Level</p>
                    </div>
                  </div>
                </div>

                {/* Result Text */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Corrected Text</h4>
                  <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="whitespace-pre-wrap text-sm">{outputText || "Corrected text will appear here..."}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Issues Tab */}
            {activeTab === "issues" && (
              <div className="space-y-4">
                {issues.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">No Issues Found</p>
                    <p className="text-sm">Your text is grammatically correct!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">{issues.length} issues found</p>
                      <Button variant="outline" size="sm" onClick={handleApplyAll}>
                        Apply All Fixes
                      </Button>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {issues.map((issue, i) => (
                        <div
                          key={i}
                          className={cn("p-4 rounded-lg border", getSeverityColor(issue.severity))}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {getSeverityIcon(issue.severity)}
                              <div>
                                <p className="font-medium capitalize">{issue.type}</p>
                                <p className="text-sm opacity-80">{issue.message}</p>
                                {issue.suggestions.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {issue.suggestions.map((suggestion, j) => (
                                      <Button
                                        key={j}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApplyFix(i, suggestion)}
                                        disabled={appliedFixes.has(i)}
                                        className="text-xs bg-background/50"
                                      >
                                        {appliedFixes.has(i) ? "Applied" : suggestion}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Suggestions Tab */}
            {activeTab === "suggestions" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {followUpSuggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="h-auto py-4 justify-start text-left"
                      onClick={suggestion.action}
                    >
                      <suggestion.icon className="w-5 h-5 mr-3 text-orange-500" />
                      <span>{suggestion.label}</span>
                      <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                    </Button>
                  ))}
                </div>
                <div className="text-center text-sm text-muted-foreground py-4">
                  Click any suggestion to refine your text further
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
                    placeholder="Ask for refinements... (e.g., 'Make it more formal' or 'Simplify the language')"
                  />
                  <Button onClick={handleChatSubmit} disabled={!chatMessage.trim()}>
                    <MessageSquare className="w-4 h-4" />
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
      {outputText && issues.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-orange-500" />
              AI Insights
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
                  {scores.grammar >= 80 && <li>• Strong grammatical structure</li>}
                  {scores.clarity >= 80 && <li>• Clear and understandable writing</li>}
                  {scores.engagement >= 80 && <li>• Good vocabulary usage</li>}
                  {scores.delivery >= 80 && <li>• Well-punctuated text</li>}
                  {stats.words > 50 && <li>• Sufficient content depth</li>}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Areas to Improve
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {issueStats.grammar > 0 && <li>• {issueStats.grammar} grammar issue(s) found</li>}
                  {issueStats.spelling > 0 && <li>• {issueStats.spelling} spelling error(s)</li>}
                  {issueStats.punctuation > 0 && <li>• {issueStats.punctuation} punctuation issue(s)</li>}
                  {issueStats.clarity > 0 && <li>• {issueStats.clarity} clarity improvement(s) needed</li>}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  Recommended Actions
                </h4>
                <ul className="space-y-2">
                  {issues.slice(0, 3).map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-orange-500 mt-0.5" />
                      <span className="text-muted-foreground">{issue.suggestions[0] || `Fix ${issue.type}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
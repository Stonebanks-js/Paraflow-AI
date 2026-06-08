"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor, CopyButton } from "@/components/common/TextEditor";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { useConversationStore } from "@/stores";
import { useSEO } from "@/hooks/use-api";
import { Progress } from "@/components/ui/progress";
import { cn, countWords } from "@/lib/utils";
import {
  Search, Loader2, AlertCircle, RotateCcw, Brain, CheckCircle2, Clock, Coins,
  Download, ChevronRight, TrendingUp, TrendingDown, Minus, Eye, Lightbulb,
  FileText, Hash, AlignLeft, Target, Zap, Star, MessageSquare, Send, Timer
} from "lucide-react";

const contentTypes = [
  { id: "blog", label: "Blog Post", description: "Informal articles" },
  { id: "article", label: "Article", description: "Formal pieces" },
  { id: "product", label: "Product Description", description: "E-commerce content" },
  { id: "landing", label: "Landing Page", description: "Marketing pages" },
];

const priorityLevels = [
  { id: "high", label: "High Priority", color: "text-red-500", bg: "bg-red-500/10" },
  { id: "medium", label: "Medium Priority", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { id: "low", label: "Low Priority", color: "text-green-500", bg: "bg-green-500/10" },
];

export function SEOPanel() {
  const toolId = "seo";
  const { getConversation, addMessage, setInputText, clearConversation } = useConversationStore();
  const conversation = getConversation(toolId);

  const [inputText, setLocalInputText] = useState(conversation.inputText);
  const [keywords, setKeywords] = useState("");
  const [contentType, setContentType] = useState("blog");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "recommendations" | "chat">("overview");

  const seoMutation = useSEO();

  useEffect(() => {
    setInputText(toolId, inputText);
  }, [inputText, toolId, setInputText]);

  const handleOptimize = async () => {
    if (!inputText.trim()) return;
    const keywordList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywordList.length === 0) return;

    setIsProcessing(true);

    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    });

    try {
      await seoMutation.mutateAsync({
        text: inputText,
        target_keywords: keywordList,
        content_type: contentType,
      });

      addMessage(toolId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "SEO analysis complete",
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("SEO optimization failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setLocalInputText("");
    setKeywords("");
    clearConversation(toolId);
  };

  const analysis = seoMutation.data?.analysis;

  const stats = useMemo(() => ({
    words: countWords(inputText),
    characters: inputText.length,
    sentences: inputText.split(/[.!?]+/).filter(s => s.trim()).length,
    paragraphs: inputText.split(/\n\n+/).filter(p => p.trim()).length,
  }), [inputText]);

  const overallScore = useMemo(() => {
    if (!analysis) return 0;
    const readability = analysis.readability_score || 0;
    const title = analysis.title_quality || 0;
    const keywordScore = Math.min(100, Object.values(analysis.keyword_density || {}).length * 20);
    return Math.round((readability + title + keywordScore) / 3);
  }, [analysis]);

  const categorizedSuggestions = useMemo(() => {
    if (!analysis?.suggestions) return { high: [], medium: [], low: [] };
    return {
      high: analysis.suggestions.slice(0, Math.ceil(analysis.suggestions.length / 3)),
      medium: analysis.suggestions.slice(Math.ceil(analysis.suggestions.length / 3), Math.ceil(analysis.suggestions.length * 2 / 3)),
      low: analysis.suggestions.slice(Math.ceil(analysis.suggestions.length * 2 / 3)),
    };
  }, [analysis]);

  const keywordDensities = useMemo(() => {
    if (!analysis?.keyword_density) return [];
    return Object.entries(analysis.keyword_density).map(([keyword, density]) => ({
      keyword,
      density: density as number,
      status: (density as number) >= 1 && (density as number) <= 3 ? "optimal" : (density as number) < 1 ? "low" : "high",
    }));
  }, [analysis]);

  const processingTime = 3.1;
  const creditsUsed = 5;

  return (
    <div className="space-y-6">
      {/* Results Overview Card */}
      {analysis && (
        <Card className="bg-gradient-to-r from-yellow-500/5 to-orange-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">SEO Analysis Complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Search className="w-4 h-4" />
                  <span>{contentTypes.find(c => c.id === contentType)?.label}</span>
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
                  <span className="font-medium">SEO Score:</span>
                  <span className={overallScore >= 80 ? "text-green-500" : overallScore >= 60 ? "text-yellow-500" : "text-red-500"}>
                    {overallScore}/100
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => {}}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
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
              <Search className="w-5 h-5 text-yellow-500" />
              SEO Optimizer
            </CardTitle>
            <CardDescription>
              Analyze and optimize for search
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Keywords (comma-separated)</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., AI writing, SEO, content optimization"
                className="w-full h-10 px-3 rounded-lg border bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Content Type</label>
              <div className="grid grid-cols-2 gap-2">
                {contentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id)}
                    className={cn(
                      "p-2 rounded-lg text-left transition-colors",
                      contentType === type.id
                        ? "bg-yellow-500 text-white"
                        : "bg-muted hover:bg-accent"
                    )}
                  >
                    <p className="text-xs font-medium">{type.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <TextEditor
              value={inputText}
              onChange={setLocalInputText}
              placeholder="Enter content to optimize..."
              minHeight="150px"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleOptimize}
                disabled={!inputText.trim() || !keywords.trim() || isProcessing}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Analyze SEO
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
                <CardTitle>SEO Analysis Results</CardTitle>
                <CardDescription>
                  {analysis ? `Overall Score: ${overallScore}/100` : "Enter keywords and content to analyze"}
                </CardDescription>
              </div>
              {analysis && <CopyButton text={inputText} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              {(["overview", "keywords", "recommendations", "chat"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="capitalize"
                >
                  {tab === "overview" ? "Overview" : tab === "keywords" ? "Keywords" : tab}
                </Button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && analysis && (
              <div className="space-y-6">
                {/* Score Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={overallScore} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Overall</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={analysis.readability_score || 0} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Readability</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <ScoreGauge score={analysis.title_quality || 0} size="md" showLabel={false} />
                    <span className="text-sm font-medium mt-2">Title Quality</span>
                  </div>
                  <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold">{keywordDensities.length}</div>
                    <span className="text-sm font-medium mt-2">Keywords</span>
                  </div>
                </div>

                {/* Content Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.words}</p>
                      <p className="text-xs text-muted-foreground">Words</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Hash className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.characters}</p>
                      <p className="text-xs text-muted-foreground">Characters</p>
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
                    <Target className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{stats.paragraphs}</p>
                      <p className="text-xs text-muted-foreground">Paragraphs</p>
                    </div>
                  </div>
                </div>

                {/* Quick Recommendations */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Quick Wins</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {categorizedSuggestions.high.slice(0, 3).map((suggestion, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <TrendingUp className="w-4 h-4 text-red-500 mt-0.5" />
                        <p className="text-sm">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Keywords Tab */}
            {activeTab === "keywords" && (
              <div className="space-y-4">
                {keywordDensities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter keywords and run analysis</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {keywordDensities.map(({ keyword, density, status }) => (
                      <div key={keyword} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{keyword}</span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              status === "optimal" ? "bg-green-500/20 text-green-500" :
                              status === "low" ? "bg-yellow-500/20 text-yellow-500" :
                              "bg-red-500/20 text-red-500"
                            )}>
                              {status}
                            </span>
                          </div>
                          <span className="font-bold">{density}%</span>
                        </div>
                        <Progress 
                          value={Math.min(density * 20, 100)} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {density < 1 ? "Add more keyword mentions" :
                           density > 3 ? "Keyword density too high (may spam)" :
                           "Good keyword usage"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations Tab */}
            {activeTab === "recommendations" && analysis && (
              <div className="space-y-4">
                {/* Priority Sections */}
                {(["high", "medium", "low"] as const).map((priority) => (
                  categorizedSuggestions[priority].length > 0 && (
                    <div key={priority} className="space-y-3">
                      <h4 className={cn(
                        "text-sm font-medium flex items-center gap-2",
                        priorityLevels.find(p => p.id === priority)?.color
                      )}>
                        {priority === "high" && <TrendingUp className="w-4 h-4" />}
                        {priority === "medium" && <Minus className="w-4 h-4" />}
                        {priority === "low" && <CheckCircle2 className="w-4 h-4" />}
                        {priorityLevels.find(p => p.id === priority)?.label}
                      </h4>
                      <div className="space-y-2">
                        {categorizedSuggestions[priority].map((suggestion, i) => (
                          <div key={i} className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            priorityLevels.find(p => p.id === priority)?.bg
                          )}>
                            <AlertCircle className={cn(
                              "w-5 h-5 mt-0.5",
                              priorityLevels.find(p => p.id === priority)?.color
                            )} />
                            <p className="text-sm">{suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chat about SEO improvements coming soon</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel */}
      {analysis && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-yellow-500" />
              SEO Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Keyword Opportunities
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use primary keyword in first 100 words</li>
                  <li>• Include keywords in headings (H2, H3)</li>
                  <li>• Add internal and external links</li>
                  <li>• Optimize meta description</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  Content Tips
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Aim for 300+ words minimum</li>
                  <li>• Use short paragraphs (3-4 sentences)</li>
                  <li>• Add relevant images with alt text</li>
                  <li>• Include a clear call-to-action</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Star className="w-4 h-4 text-orange-500" />
                  Best Practices
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Maintain keyword density of 1-3%</li>
                  <li>• Write compelling title (50-60 chars)</li>
                  <li>• Use bullet points for readability</li>
                  <li>• Update content regularly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
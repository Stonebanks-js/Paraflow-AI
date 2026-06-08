"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextEditor, CopyButton } from "@/components/common/TextEditor";
import { ScoreGauge } from "@/components/common/ScoreGauge";
import { useConversationStore } from "@/stores";
import { useTranslate } from "@/hooks/use-api";
import { Progress } from "@/components/ui/progress";
import { cn, countWords } from "@/lib/utils";
import {
  Languages, Loader2, RotateCcw, Brain, CheckCircle2, Clock, Coins,
  ArrowRightLeft, Download, MessageSquare, ChevronRight, Send, Eye,
  Globe, FileText, Star, AlertCircle, Lightbulb, TrendingUp, Timer
} from "lucide-react";

const languages = [
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "th", name: "Thai", flag: "🇹🇭" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
  { code: "cs", name: "Czech", flag: "🇨🇿" },
  { code: "el", name: "Greek", flag: "🇬🇷" },
  { code: "he", name: "Hebrew", flag: "🇮🇱" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "ms", name: "Malay", flag: "🇲🇾" },
  { code: "ro", name: "Romanian", flag: "🇷🇴" },
  { code: "hu", name: "Hungarian", flag: "🇭🇺" },
  { code: "uk", name: "Ukrainian", flag: "🇺🇦" },
  { code: "bg", name: "Bulgarian", flag: "🇧🇬" },
];

const translationTypes = [
  { id: "general", label: "General", description: "Everyday translation" },
  { id: "formal", label: "Formal", description: "Professional and official" },
  { id: "casual", label: "Casual", description: "Conversational and relaxed" },
  { id: "business", label: "Business", description: "Corporate communication" },
  { id: "academic", label: "Academic", description: "Scholarly content" },
];

export function TranslatorPanel() {
  const toolId = "translator";
  const { getConversation, addMessage, setInputText, setOutputText, clearConversation } = useConversationStore();
  const conversation = getConversation(toolId);

  const [inputText, setLocalInputText] = useState(conversation.inputText);
  const [outputText, setLocalOutputText] = useState(conversation.outputText);
  const [targetLang, setTargetLang] = useState("es");
  const [preserveTone, setPreserveTone] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"result" | "report" | "chat">("result");
  const [translationType, setTranslationType] = useState("general");

  const translateMutation = useTranslate();

  useEffect(() => {
    setInputText(toolId, inputText);
  }, [inputText, toolId, setInputText]);

  useEffect(() => {
    setOutputText(toolId, outputText);
  }, [outputText, toolId, setOutputText]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);

    addMessage(toolId, {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    });

    try {
      const result = await translateMutation.mutateAsync({
        text: inputText,
        source_lang: "en",
        target_lang: targetLang,
        preserve_tone: preserveTone,
      });
      setLocalOutputText(result.translated_text || "");

      addMessage(toolId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.translated_text || "",
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Translation failed:", error);
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
      content: `Refine translation: ${chatMessage}\n\nOriginal: ${inputText}\n\nCurrent translation: ${outputText}`,
      timestamp: Date.now(),
    });
    setChatMessage("");
  };

  const handleExport = (format: 'txt' | 'pdf') => {
    const targetLanguage = languages.find(l => l.code === targetLang);
    const content = `TRANSLATION REPORT
${'='.repeat(50)}

SOURCE: English
TARGET: ${targetLanguage?.name || targetLang}
TRANSLATION TYPE: ${translationType}

CONFIDENCE
----------
Overall Confidence: ${Math.round((translateMutation.data?.confidence || 0) * 100)}%
Quality Score: ${qualityScore}/100

STATISTICS
----------
Original Words: ${inputStats.words}
Original Characters: ${inputStats.characters}
Translated Words: ${outputStats.words}
Translated Characters: ${outputStats.characters}

${'='.repeat(50)}

ORIGINAL TEXT (English)
------------------------
${inputText}

${'='.repeat(50)}

TRANSLATED TEXT (${targetLanguage?.name || targetLang})
-------------------------------------------------------
${outputText}
`;
    
    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translation-report.txt';
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

  const confidence = translateMutation.data?.confidence || 0;
  const qualityScore = Math.round(confidence * 100);

  const targetLanguage = languages.find(l => l.code === targetLang);

  const followUpSuggestions = [
    { label: "Make More Formal", action: () => setChatMessage("Make this translation more formal") },
    { label: "Make Casual", action: () => setChatMessage("Make this translation more casual and conversational") },
    { label: "Check Grammar", action: () => {}, icon: AlertCircle },
    { label: "Improve Flow", action: () => setChatMessage("Improve the natural flow of the translation") },
  ];

  const processingTime = 2.8;
  const creditsUsed = 8;

  return (
    <div className="space-y-6">
      {/* Results Overview Card */}
      {outputText && (
        <Card className="bg-gradient-to-r from-pink-500/5 to-rose-500/5 border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Translation Complete</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span>{targetLanguage?.flag} {targetLanguage?.name}</span>
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
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{Math.round(confidence * 100)}% confidence</span>
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
            <CardTitle className="text-lg">Original vs Translation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="text-lg">🇺🇸</span> English (Original)
                </h4>
                <div className="p-4 rounded-lg bg-muted/50 min-h-[150px]">
                  <p className="whitespace-pre-wrap text-sm">{inputText}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{inputStats.words} words</span>
                  <span>{inputStats.characters} characters</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="text-lg">{targetLanguage?.flag}</span> {targetLanguage?.name}
                </h4>
                <div className="p-4 rounded-lg bg-pink-500/5 border border-pink-500/20 min-h-[150px]">
                  <p className="whitespace-pre-wrap text-sm">{outputText}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{outputStats.words} words</span>
                  <span>{outputStats.characters} characters</span>
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
              <Languages className="w-5 h-5 text-pink-500" />
              Translator
            </CardTitle>
            <CardDescription>
              Translate across 30+ languages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Language</label>
              <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setTargetLang(lang.code)}
                    className={cn(
                      "p-2 rounded-lg text-left transition-colors flex items-center gap-2",
                      targetLang === lang.code
                        ? "bg-pink-500 text-white"
                        : "bg-muted hover:bg-accent"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span className="text-xs truncate">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Translation Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Translation Style</label>
              <div className="grid grid-cols-2 gap-2">
                {translationTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setTranslationType(type.id)}
                    className={cn(
                      "p-2 rounded-lg text-left transition-colors",
                      translationType === type.id
                        ? "bg-pink-500 text-white"
                        : "bg-muted hover:bg-accent"
                    )}
                  >
                    <p className="text-xs font-medium">{type.label}</p>
                    <p className="text-xs opacity-70">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <TextEditor
              value={inputText}
              onChange={setLocalInputText}
              placeholder="Enter text to translate..."
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="preserveTone"
                checked={preserveTone}
                onChange={(e) => setPreserveTone(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="preserveTone" className="text-sm">
                Preserve original tone and formality
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTranslate}
                disabled={!inputText.trim() || isProcessing}
                className="flex-1 bg-pink-500 hover:bg-pink-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4 mr-2" />
                    Translate
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
                <CardTitle>Translation Results</CardTitle>
                <CardDescription>
                  {outputText
                    ? `${targetLanguage?.flag} ${targetLanguage?.name} translation`
                    : "Enter text to translate"}
                </CardDescription>
              </div>
              {outputText && <CopyButton text={outputText} />}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              {(["result", "report", "chat"] as const).map((tab) => (
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
                        <div className="w-16 h-16 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin"></div>
                        <Languages className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-pink-500" />
                      </div>
                      <p className="text-sm text-muted-foreground animate-pulse">Translating your text...</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-pink-500/5 border border-pink-500/20 min-h-[200px]">
                    <p className="whitespace-pre-wrap text-sm">{outputText || "Translation will appear here..."}</p>
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

            {/* Report Tab */}
            {activeTab === "report" && outputText && (
              <div className="space-y-6">
                {/* Confidence Score */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center">
                    <ScoreGauge score={qualityScore} size="lg" />
                    <p className="text-sm font-medium mt-2">Translation Quality</p>
                    <p className="text-xs text-muted-foreground">Confidence score based on AI assessment</p>
                  </div>
                </div>

                {/* Quality Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">Overall Confidence</div>
                    <div className="text-2xl font-bold">{Math.round(confidence * 100)}%</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">Word Match</div>
                    <div className="text-2xl font-bold">{Math.round((Math.min(outputStats.words / Math.max(inputStats.words, 1), 1.5)) * 100)}%</div>
                  </div>
                </div>

                {/* Language Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Language Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🇺🇸</span>
                        <span className="text-sm font-medium">Source</span>
                      </div>
                      <p className="text-lg font-bold">English</p>
                    </div>
                    <div className="p-3 rounded-lg bg-pink-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{targetLanguage?.flag}</span>
                        <span className="text-sm font-medium">Target</span>
                      </div>
                      <p className="text-lg font-bold">{targetLanguage?.name}</p>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Translation Statistics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Word Count</span>
                      <span>{inputStats.words} → {outputStats.words}</span>
                    </div>
                    <Progress value={(outputStats.words / Math.max(inputStats.words, 1)) * 50} className="h-2" />
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
                    placeholder="Ask for refinements... (e.g., 'Make it more formal' or 'Improve the translation')"
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
        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-pink-500" />
              Translation Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Translation Quality
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Accurate meaning transfer</li>
                  <li>• Natural language flow</li>
                  <li>• Proper grammar structure</li>
                  <li>• Appropriate vocabulary</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Tips
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Break up long sentences for better translation</li>
                  <li>• Avoid idioms that may not translate</li>
                  <li>• Use consistent terminology</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-500" />
                  Try These
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Translate in different styles</li>
                  <li>• Compare formal vs casual</li>
                  <li>• Use as input for other tools</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
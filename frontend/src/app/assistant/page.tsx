"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Textarea } from "@/components/ui";
import { MarkdownMessage } from "@/components/features/assistant/MarkdownMessage";
import {
  useAssistantSessions,
  useAssistantSession,
  useSendAssistantMessage,
  useDeleteAssistantSession,
} from "@/hooks/use-api";
import type { AssistantMessage } from "@/types";
import { cn } from "@/lib/utils";
import {
  Bot,
  Send,
  Paperclip,
  X,
  Plus,
  Trash2,
  Loader2,
  ArrowUpRight,
  Sparkles,
  User,
} from "lucide-react";

const MAX_ATTACHMENT_CHARS = 20000;

export default function AssistantPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; text: string } | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<AssistantMessage[]>([]);
  const [pending, setPending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sessionsQuery = useAssistantSessions();
  const sessionQuery = useAssistantSession(selectedSessionId);
  const sendMessage = useSendAssistantMessage();
  const deleteSession = useDeleteAssistantSession();

  useEffect(() => {
    if (sessionQuery.data?.messages) {
      setLocalMessages(sessionQuery.data.messages);
    } else if (!selectedSessionId) {
      setLocalMessages([]);
    }
  }, [sessionQuery.data, selectedSessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [localMessages, pending]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError(null);

    const isTextLike =
      file.type.startsWith("text/") ||
      /\.(txt|md|markdown|csv|json|log)$/i.test(file.name);
    if (!isTextLike) {
      setAttachError("Only plain text files are supported right now (.txt, .md, .csv, .json).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setAttachment({ name: file.name, text: text.slice(0, MAX_ATTACHMENT_CHARS) });
    };
    reader.onerror = () => setAttachError("Couldn't read that file. Please try again.");
    reader.readAsText(file);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || pending) return;

    const optimisticUser: AssistantMessage = {
      role: "user",
      content,
      attachment_name: attachment?.name || null,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    const attachmentToSend = attachment;
    setAttachment(null);
    setPending(true);

    try {
      const result = await sendMessage.mutateAsync({
        sessionId: selectedSessionId,
        content,
        attachment_text: attachmentToSend?.text,
        attachment_name: attachmentToSend?.name,
      });
      if (!selectedSessionId) {
        setSelectedSessionId(result.session_id);
      }
      setLocalMessages((prev) => {
        const withoutOptimistic = prev.slice(0, -1);
        return [...withoutOptimistic, result.user_message, result.assistant_message];
      });
    } catch (err) {
      setLocalMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, something went wrong sending that message: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const handleNewChat = () => {
    setSelectedSessionId(null);
    setLocalMessages([]);
    setInput("");
    setAttachment(null);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession.mutateAsync(id);
    if (id === selectedSessionId) handleNewChat();
  };

  const sessions = sessionsQuery.data?.items ?? [];

  return (
    <AppShell>
      <div className="flex h-screen lg:h-[calc(100vh)] pt-16 lg:pt-0">
        {/* Session list */}
        <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-border/50 bg-background/50">
          <div className="p-3 border-b border-border/50">
            <Button onClick={handleNewChat} className="w-full gap-2" size="sm">
              <Plus className="w-4 h-4" />
              New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                No chats yet — start one below.
              </p>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-2.5 py-2 cursor-pointer text-sm",
                  s.id === selectedSessionId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                onClick={() => setSelectedSessionId(s.id)}
              >
                <span className="flex-1 truncate">{s.title || "New chat"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 border-b border-border/50 flex items-center px-4 gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-sm leading-none">Para Agent</p>
              <p className="text-[11px] text-muted-foreground">Free assistant · knows your tools</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {localMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Ask Para Agent anything</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Ask a question, brainstorm, or attach a file. If you want a specific job done —
                  translating, detecting AI text, fixing grammar — I&apos;ll point you to the right tool.
                </p>
              </div>
            )}

            {localMessages.map((m, i) => (
              <motion.div
                key={m.id || i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    m.role === "user" ? "bg-muted" : "bg-gradient-to-br from-primary to-purple-500"
                  )}
                >
                  {m.role === "user" ? (
                    <User className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"
                  )}
                >
                  {m.attachment_name && (
                    <p className="text-xs opacity-70 mb-1.5 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> {m.attachment_name}
                    </p>
                  )}
                  {m.role === "assistant" ? (
                    <MarkdownMessage content={m.content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  )}
                  {m.suggested_engine_url && (
                    <Link
                      href={m.suggested_engine_url}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open this tool <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}

            {pending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-muted/60 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border/50 p-3 shrink-0">
            <AnimatePresence>
              {attachment && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-muted/60 text-xs w-fit"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="max-w-[200px] truncate">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {attachError && <p className="text-xs text-destructive mb-2">{attachError}</p>}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.csv,.json,.log,text/plain"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Attach a text file"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message Para Agent…"
                className="min-h-[44px] max-h-40 resize-none"
                rows={1}
              />
              <Button onClick={handleSend} disabled={!input.trim() || pending} size="icon" className="shrink-0">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
              Para Agent is free to use and doesn&apos;t cost credits.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

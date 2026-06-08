"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn, countWords } from "@/lib/utils";
import { Copy, Loader2, CheckCheck, ArrowRight } from "lucide-react";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export function TextEditor({
  value,
  onChange,
  placeholder = "Enter your text here...",
  disabled = false,
  minHeight = "200px",
}: TextEditorProps) {
  const wordCount = countWords(value);

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="resize-none"
        style={{ minHeight }}
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{wordCount} words</span>
        <span>{value.length} chars</span>
      </div>
    </div>
  );
}

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={cn("h-8 w-8", className)}
    >
      {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "outline";
  className?: string;
}

export function ActionButton({
  onClick,
  loading = false,
  disabled = false,
  children,
  variant = "default",
  className,
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn("gap-2", className)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

interface SendToHumanizerButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SendToHumanizerButton({ onClick, disabled }: SendToHumanizerButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="gap-2"
    >
      Humanize <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
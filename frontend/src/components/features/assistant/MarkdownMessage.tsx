"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Renders assistant chat content as clean, ChatGPT/Claude-style Markdown.
 * No typography plugin is installed in this project, so every element is
 * styled explicitly here rather than relying on a `prose` class -- that
 * keeps rendering predictable instead of depending on a plugin that may
 * not be present at build time.
 */
export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn("text-sm leading-relaxed space-y-3 break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mt-4 mb-2 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1.5 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground my-3">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isBlock = /language-/.test(codeClassName || "");
            if (isBlock) {
              return (
                <code
                  className="block whitespace-pre-wrap break-words font-mono text-xs"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="rounded-lg bg-muted/70 border border-border/50 p-3 overflow-x-auto mb-3">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border/50 px-2 py-1 bg-muted/50 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border/50 px-2 py-1">{children}</td>,
          hr: () => <hr className="border-border/50 my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

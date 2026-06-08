"use client";

import { AppShell } from "@/components/layout/AppShell";
import { SummarizerPanel } from "@/components/features/SummarizerPanel";

export default function SummarizerPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Summarizer</h1>
        <p className="text-muted-foreground">
          Condense text into key points with multiple output styles
        </p>
      </div>
      <SummarizerPanel />
    </AppShell>
  );
}
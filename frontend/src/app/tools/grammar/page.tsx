"use client";

import { AppShell } from "@/components/layout/AppShell";
import { GrammarPanel } from "@/components/features/GrammarPanel";

export default function GrammarPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Grammar Checker</h1>
        <p className="text-muted-foreground">
          Identify and fix grammatical, spelling, punctuation, and style issues
        </p>
      </div>
      <GrammarPanel />
    </AppShell>
  );
}
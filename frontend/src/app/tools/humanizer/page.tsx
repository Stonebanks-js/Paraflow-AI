"use client";

import { AppShell } from "@/components/layout/AppShell";
import { HumanizerPanel } from "@/components/features/HumanizerPanel";

export default function HumanizerPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Humanizer</h1>
        <p className="text-muted-foreground">
          Transform AI-generated text to bypass detection tools with bypass-grade humanization
        </p>
      </div>
      <HumanizerPanel />
    </AppShell>
  );
}
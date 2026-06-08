"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TranslatorPanel } from "@/components/features/TranslatorPanel";

export default function TranslatorPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Translator</h1>
        <p className="text-muted-foreground">
          Translate across 100+ languages with tone preservation
        </p>
      </div>
      <TranslatorPanel />
    </AppShell>
  );
}
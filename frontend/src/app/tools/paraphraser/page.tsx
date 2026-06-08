"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ParaphraserPanel } from "@/components/features/ParaphraserPanel";

export default function ParaphraserPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Paraphraser</h1>
        <p className="text-muted-foreground">
          Rewrite text with preserved meaning but improved clarity across 8 different modes
        </p>
      </div>
      <ParaphraserPanel />
    </AppShell>
  );
}
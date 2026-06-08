"use client";

import { AppShell } from "@/components/layout/AppShell";
import { WritingDNAPanel } from "@/components/features/WritingDNAPanel";

export default function WritingDNAPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Writing DNA</h1>
        <p className="text-muted-foreground">
          Build your personal style fingerprint for personalized AI output
        </p>
      </div>
      <WritingDNAPanel />
    </AppShell>
  );
}
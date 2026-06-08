"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AgentStudioPanel } from "@/components/features/AgentStudioPanel";

export default function AgentStudioPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Multi-Agent Writing Studio</h1>
        <p className="text-muted-foreground">
          Supervisor-coordinated AI agents collaborating to improve your content
        </p>
      </div>
      <AgentStudioPanel />
    </AppShell>
  );
}
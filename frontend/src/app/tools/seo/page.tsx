"use client";

import { AppShell } from "@/components/layout/AppShell";
import { SEOPanel } from "@/components/features/SEOPanel";

export default function SEOPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">SEO Optimizer</h1>
        <p className="text-muted-foreground">
          Analyze and optimize content for search engines with real-time keyword intelligence
        </p>
      </div>
      <SEOPanel />
    </AppShell>
  );
}
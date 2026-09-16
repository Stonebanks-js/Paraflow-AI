"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import { Bot, X, ArrowRight } from "lucide-react";

const STORAGE_KEY = "paraflow_assistant_nudge_last_shown";
const RESHOW_AFTER_MS = 24 * 60 * 60 * 1000; // once per day, per browser
const SHOW_DELAY_MS = 25000;

/**
 * Periodic dashboard nudge pointing users at Para Agent. Gated by
 * localStorage (a per-browser convenience, not shared state) so it
 * surfaces roughly once a day rather than on every dashboard visit --
 * a "period of time" cadence without being a repeat annoyance in one
 * session. Wrapped in try/catch since localStorage can throw (private
 * browsing, blocked storage) and that must never break the dashboard.
 */
export function AssistantNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let lastShown = 0;
    try {
      lastShown = Number(localStorage.getItem(STORAGE_KEY) || 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - lastShown < RESHOW_AFTER_MS) return;

    const timer = setTimeout(() => {
      setVisible(true);
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-40 w-80 max-w-[calc(100vw-3rem)]"
        >
          <div className="rounded-2xl border border-border/50 bg-card shadow-2xl p-4 glass">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Need a hand?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Para Agent is a free AI assistant that knows every tool here — ask it anything.
                </p>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-accent shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Link href="/assistant" onClick={() => setVisible(false)}>
              <Button size="sm" className="w-full mt-3 gap-1.5">
                Chat with Para Agent <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

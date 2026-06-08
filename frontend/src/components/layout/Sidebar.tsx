"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Feather,
  Sparkles,
  ShieldCheck,
  SpellCheck,
  FileText,
  Languages,
  Search,
  GitCompare,
  FlaskConical,
  Dna,
  Settings,
  CreditCard,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, useUserStore } from "@/stores";
import { useState } from "react";

const tools = [
  { id: "paraphraser", name: "Paraphraser", icon: Feather, color: "text-blue-500" },
  { id: "humanizer", name: "AI Humanizer", icon: Sparkles, color: "text-purple-500" },
  { id: "detector", name: "AI Detector", icon: ShieldCheck, color: "text-green-500" },
  { id: "grammar", name: "Grammar", icon: SpellCheck, color: "text-orange-500" },
  { id: "summarizer", name: "Summarizer", icon: FileText, color: "text-cyan-500" },
  { id: "translator", name: "Translator", icon: Languages, color: "text-pink-500" },
  { id: "seo", name: "SEO Optimizer", icon: Search, color: "text-yellow-500" },
  { id: "writing-dna", name: "Writing DNA", icon: Dna, color: "text-emerald-500" },
];

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, activeTool } = useAppStore();
  const { user, credits, logout } = useUserStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToolClick = (toolId: string) => {
    router.push(`/tools/${toolId}`);
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border rounded-lg"
      >
        {mobileOpen ? <X /> : <Menu />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r z-50 transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Paraflow AI</span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}

            <div className="pt-4">
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Writing Tools
              </p>
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === `/tools/${tool.id}`
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <tool.icon className={cn("w-4 h-4", tool.color)} />
                  {tool.name}
                </button>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Credits</span>
              <span className="font-medium">{credits}</span>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
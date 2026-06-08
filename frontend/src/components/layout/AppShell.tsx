"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { useUserStore } from "@/stores";
import {
  Sparkles,
  Home,
  FileText,
  Feather,
  SparklesIcon,
  ShieldCheck,
  SpellCheck,
  Languages,
  Search,
  Dna,
  FlaskConical,
  History,
  Settings,
  CreditCard,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";

const tools = [
  { name: "Dashboard", icon: Home, href: "/dashboard" },
  { name: "Paraphraser", icon: Feather, href: "/tools/paraphraser", color: "text-blue-400" },
  { name: "Humanizer", icon: SparklesIcon, href: "/tools/humanizer", color: "text-purple-400" },
  { name: "Detector", icon: ShieldCheck, href: "/tools/detector", color: "text-green-400" },
  { name: "Grammar", icon: SpellCheck, href: "/tools/grammar", color: "text-orange-400" },
  { name: "Summarizer", icon: FileText, href: "/tools/summarizer", color: "text-cyan-400" },
  { name: "Translator", icon: Languages, href: "/tools/translator", color: "text-pink-400" },
  { name: "SEO", icon: Search, href: "/tools/seo", color: "text-yellow-400" },
  { name: "Writing DNA", icon: Dna, href: "/tools/writing-dna", color: "text-emerald-400" },
  { name: "History", icon: History, href: "/history" },
];

const settings = [
  { name: "Settings", icon: Settings, href: "/settings" },
  { name: "Billing", icon: CreditCard, href: "/billing" },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, credits, logout } = useUserStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const themeOptions = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-full px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">Paraflow AI</span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-accent"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarCollapsed ? 80 : 280,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-screen flex-col border-r bg-background/50 backdrop-blur-xl z-50",
          sidebarCollapsed && "items-center"
        )}
      >
        {/* Logo */}
        <div className={cn("h-16 flex items-center border-b border-border/50", sidebarCollapsed ? "justify-center px-2" : "px-4")}>
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-xl"
              >
                Paraflow AI
              </motion.span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {tools.map((tool) => {
            const isActive = pathname === tool.href;
            const Icon = tool.icon;

            return (
              <Link key={tool.href} href={tool.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("w-5 h-5 shrink-0", tool.color)} />
                  {!sidebarCollapsed && <span className="font-medium">{tool.name}</span>}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Settings Section */}
        <div className="border-t border-border/50 py-4 px-3 space-y-1">
          {settings.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Theme Toggle */}
        <div className={cn("border-t border-border/50 p-3", sidebarCollapsed && "w-full")}>
          <div className={cn("flex rounded-xl bg-muted/50 p-1", sidebarCollapsed && "flex-col")}>
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = resolvedTheme === option.value || (option.value === "system" && resolvedTheme !== "light" && resolvedTheme !== "dark");

              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                    sidebarCollapsed && "w-full"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {!sidebarCollapsed && <span>{option.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", sidebarCollapsed && "rotate-180")} />
        </button>

        {/* User Section */}
        {user && (
          <div className={cn("border-t border-border/50 p-3", sidebarCollapsed && "w-full")}>
            <div className={cn("flex items-center gap-3 rounded-xl bg-muted/50 p-3", sidebarCollapsed && "justify-center")}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{credits} credits</p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-0 h-screen w-[280px] flex flex-col border-r bg-background/95 backdrop-blur-xl z-50"
          >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">Paraflow AI</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-accent">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {tools.map((tool) => {
                const isActive = pathname === tool.href;
                const Icon = tool.icon;

                return (
                  <Link key={tool.href} href={tool.href} onClick={() => setMobileOpen(false)}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 shrink-0", tool.color)} />
                      <span className="font-medium">{tool.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* User Section */}
            {user && (
              <div className="border-t border-border/50 p-4">
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground">{credits} credits</p>
                  </div>
                  <button onClick={logout} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-destructive">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="min-h-screen pt-16 lg:pt-0"
      >
        {children}
      </motion.main>
    </div>
  );
}
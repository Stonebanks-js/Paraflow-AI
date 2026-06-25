"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button, Progress, Badge } from "@/components/ui";
import { useUserStore } from "@/stores";
import { useCredits } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Feather,
  SparklesIcon,
  ShieldCheck,
  SpellCheck,
  FileText,
  Languages,
  Search,
  Dna,
  FlaskConical,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
  Target,
  BarChart3,
  Brain,
  Lightbulb,
  Star,
  ChevronRight,
  Play,
} from "lucide-react";

const tools = [
  { id: "paraphraser", name: "Paraphraser", icon: Feather, color: "text-blue-400", bg: "bg-blue-400/10", gradient: "from-blue-500/20 to-blue-400/5" },
  { id: "humanizer", name: "Humanizer", icon: SparklesIcon, color: "text-purple-400", bg: "bg-purple-400/10", gradient: "from-purple-500/20 to-purple-400/5" },
  { id: "detector", name: "AI Detector", icon: ShieldCheck, color: "text-green-400", bg: "bg-green-400/10", gradient: "from-green-500/20 to-green-400/5" },
  { id: "grammar", name: "Grammar", icon: SpellCheck, color: "text-orange-400", bg: "bg-orange-400/10", gradient: "from-orange-500/20 to-orange-400/5" },
  { id: "summarizer", name: "Summarizer", icon: FileText, color: "text-cyan-400", bg: "bg-cyan-400/10", gradient: "from-cyan-500/20 to-cyan-400/5" },
  { id: "translator", name: "Translator", icon: Languages, color: "text-pink-400", bg: "bg-pink-400/10", gradient: "from-pink-500/20 to-pink-400/5" },
  { id: "seo", name: "SEO Optimizer", icon: Search, color: "text-yellow-400", bg: "bg-yellow-400/10", gradient: "from-yellow-500/20 to-yellow-400/5" },
  { id: "writing-dna", name: "Writing DNA", icon: Dna, color: "text-emerald-400", bg: "bg-emerald-400/10", gradient: "from-emerald-500/20 to-emerald-400/5" },
];

const quickActions = [
  { name: "Quick Paraphrase", description: "Rewrite any text instantly", icon: Feather, href: "/tools/paraphraser", color: "text-blue-400" },
  { name: "Humanize Text", description: "Make AI text sound natural", icon: SparklesIcon, href: "/tools/humanizer", color: "text-purple-400" },
  { name: "Check Grammar", description: "Fix errors instantly", icon: SpellCheck, href: "/tools/grammar", color: "text-orange-400" },
  { name: "Summarize", description: "Get key points fast", icon: FileText, href: "/tools/summarizer", color: "text-cyan-400" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useUserStore();
  const creditsQuery = useCredits();
  const [greeting, setGreeting] = useState("");
  const [stats, setStats] = useState({ documents: 0, wordsProcessed: 0, timeSaved: 0 });
  const [healthScore, setHealthScore] = useState(0);
  const [dimensions, setDimensions] = useState({ grammar: 0, clarity: 0, seo: 0 });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const usage = await api.get<{ jobs_completed?: number; words_processed?: number; time_saved_minutes?: number }>(
          "/v1/billing/usage"
        );
        if (cancelled) return;
        setStats({
          documents: usage.jobs_completed ?? 0,
          wordsProcessed: usage.words_processed ?? 0,
          timeSaved: usage.time_saved_minutes ?? 0,
        });
      } catch {
        if (!cancelled) setStats({ documents: 0, wordsProcessed: 0, timeSaved: 0 });
      }
      try {
        const health = await api.get<{ score?: number; dimensions?: { grammar?: number; clarity?: number; seo?: number } }>(
          "/v1/health/score?text="
        );
        if (cancelled) return;
        setHealthScore(health.score ?? 0);
        if (health.dimensions) {
          setDimensions({
            grammar: health.dimensions.grammar ?? 0,
            clarity: health.dimensions.clarity ?? 0,
            seo: health.dimensions.seo ?? 0,
          });
        }
      } catch {
        if (!cancelled) {
          setHealthScore(0);
          setDimensions({ grammar: 0, clarity: 0, seo: 0 });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const creditsBalance = creditsQuery.data?.balance ?? 0;
  const planTier = creditsQuery.data?.tier ?? "Free";

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold mb-1">
              {greeting}, <span className="gradient-text">{user?.full_name || "Writer"}</span>
            </h1>
            <p className="text-muted-foreground">
              Your AI-powered writing command center
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              View Analytics
            </Button>
            <Link href="/tools/paraphraser">
              <Button size="sm" className="gap-2">
                <Zap className="w-4 h-4" />
                Quick Start
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Credits Card */}
          <motion.div variants={item}>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Credits Balance</p>
                    <p className="text-3xl font-bold">{creditsBalance}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {planTier === "Free" ? "100 free credits" : "Unlimited pro credits"}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <Progress value={(creditsBalance / 100) * 100} className="mt-4 h-2" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Documents Created */}
          <motion.div variants={item}>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Documents Created</p>
                    <p className="text-3xl font-bold">{stats.documents}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {stats.documents} this week
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Words Processed */}
          <motion.div variants={item}>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Words Processed</p>
                    <p className="text-3xl font-bold">{stats.wordsProcessed.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total word count</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Time Saved */}
          <motion.div variants={item}>
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time Saved</p>
                    <p className="text-3xl font-bold">{stats.timeSaved}m</p>
                    <p className="text-xs text-muted-foreground mt-1">Estimated minutes</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tools Grid */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">AI Writing Tools</h2>
                <Link href="/tools" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {tools.map((tool, i) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <Link href={`/tools/${tool.id}`}>
                      <Card hoverable className="h-full overflow-hidden relative group">
                        <CardContent className="p-4">
                          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity", tool.gradient)} />
                          <div className="relative z-10">
                            <div className={cn("w-10 h-10 rounded-lg mb-3 flex items-center justify-center", tool.bg)}>
                              <tool.icon className={cn("w-5 h-5", tool.color)} />
                            </div>
                            <h3 className="font-medium text-sm">{tool.name}</h3>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, i) => (
                  <motion.div
                    key={action.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <Link href={action.href}>
                      <Card hoverable className="group">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <action.icon className={cn("w-6 h-6", action.color)} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium flex items-center gap-2">
                              {action.name}
                              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </h3>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Power Features */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold mb-4">Power Features</h2>
              <div className="space-y-3">
                <Link href="/tools/agent-studio">
                  <Card hoverable className="group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                          <FlaskConical className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium flex items-center gap-2">
                            Multi-Agent Studio
                            <Badge variant="gradient" className="text-xs">NEW</Badge>
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            AI agents collaborate on your document
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/tools/writing-dna">
                  <Card hoverable className="group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                          <Dna className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">Writing DNA</h3>
                          <p className="text-xs text-muted-foreground">
                            Build your personal style fingerprint
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </motion.div>

            {/* Writing Score */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Writing Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-6">
                    <div className="relative">
                      <svg className="w-32 h-32 -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-muted/30"
                        />
                        <motion.circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={351.86}
                          initial={{ strokeDashoffset: 351.86 }}
                          animate={{ strokeDashoffset: 351.86 * (1 - (healthScore || 0) / 100) }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" />
                            <stop offset="100%" stopColor="hsl(var(--chart-3))" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{healthScore || 0}</span>
                        <span className="text-xs text-muted-foreground">
                          {healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore > 0 ? "Fair" : "Start writing"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{dimensions.grammar || 0}</p>
                      <p className="text-xs text-muted-foreground">Grammar</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{dimensions.clarity || 0}</p>
                      <p className="text-xs text-muted-foreground">Clarity</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{dimensions.seo || 0}</p>
                      <p className="text-xs text-muted-foreground">SEO</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">Pro Tip</h3>
                      <p className="text-sm text-muted-foreground">
                        Use the Humanizer after paraphrasing to make your text sound more natural and engaging.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Link href="/history" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No recent activity</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start using the tools to see your activity here
                </p>
                <Link href="/tools/paraphraser">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Play className="w-4 h-4" />
                    Try Paraphraser
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  );
}
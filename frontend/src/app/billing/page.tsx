"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCredits } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { Check, Sparkles, Coins, Clock, Zap, Users2, Rocket } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    credits: 100,
    icon: Sparkles,
    features: ["Paraphraser (4 modes)", "Grammar Checker", "Summarizer", "Translator (20 languages)", "Basic Health Score"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    credits: 1000,
    icon: Rocket,
    popular: true,
    features: [
      "All Free features",
      "AI Humanizer (bypass-grade)",
      "AI Detector",
      "SEO Optimizer",
      "Writing DNA",
      "Priority processing",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    credits: 5000,
    icon: Users2,
    features: [
      "All Pro features",
      "Multi-Agent Studio",
      "Team Workspace",
      "Shared Writing DNA",
      "API Access",
      "Dedicated support",
    ],
  },
];

const creditPackages = [
  { credits: 500, price: "$9.99" },
  { credits: 1000, price: "$17.99" },
  { credits: 5000, price: "$79.99" },
];

export default function BillingPage() {
  const creditsQuery = useCredits();
  const [hoveredPackage, setHoveredPackage] = useState<number | null>(null);

  const balance = creditsQuery.data?.balance ?? 0;
  const tier = (creditsQuery.data?.tier || "free").toLowerCase();
  const currentPlan = plans.find((p) => p.id === tier) ?? plans[0];
  const monthlyAllotment = currentPlan.credits;
  const usedPct = Math.min(100, Math.max(0, 100 - (balance / monthlyAllotment) * 100));

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">Billing &amp; Plans</h1>
          <p className="text-muted-foreground">Manage your subscription and credits</p>
        </motion.div>

        {/* Current Usage */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border-primary/20 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Coins className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <Badge variant="outline" className="capitalize">{tier} plan</Badge>
                  </div>
                  <p className="text-3xl font-bold mb-3">
                    {creditsQuery.isLoading ? "…" : balance.toLocaleString()}
                    <span className="text-base font-normal text-muted-foreground"> / {monthlyAllotment.toLocaleString()} credits</span>
                  </p>
                  <Progress value={usedPct} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Plans */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === tier;
            const Icon = plan.icon;
            return (
              <motion.div key={plan.id} variants={item}>
                <Card
                  hoverable={!isCurrent}
                  className={cn(
                    "h-full relative flex flex-col",
                    plan.popular && "border-primary shadow-lg shadow-primary/10",
                    isCurrent && "border-success/40"
                  )}
                >
                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="gradient">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      {isCurrent && <Badge variant="success">Current Plan</Badge>}
                    </div>
                    <CardTitle className="mt-3">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    <div className="text-sm">
                      <span className="font-medium">{plan.credits.toLocaleString()}</span> credits/month
                    </div>
                    <ul className="space-y-2 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                      disabled={isCurrent}
                      title={isCurrent ? undefined : "Plan upgrades are coming soon"}
                    >
                      {isCurrent ? "Current Plan" : `Upgrade to ${plan.name} — Coming Soon`}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Credit Packages */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Credit Packages
              </CardTitle>
              <CardDescription>Purchase additional credits as needed — one-time top-ups, no subscription required</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {creditPackages.map((pkg, i) => (
                  <motion.button
                    key={pkg.credits}
                    onMouseEnter={() => setHoveredPackage(i)}
                    onMouseLeave={() => setHoveredPackage(null)}
                    whileHover={{ y: -2 }}
                    disabled
                    title="Credit top-ups are coming soon"
                    className="relative p-5 rounded-2xl border border-border/50 bg-card text-center transition-colors hover:border-primary/40 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <div className="text-2xl font-bold">{pkg.credits.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground mb-2">Credits</div>
                    <div className="font-medium">{pkg.price}</div>
                    <AnimatePresence>
                      {hoveredPackage === i && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center"
                        >
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Coming soon
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  );
}

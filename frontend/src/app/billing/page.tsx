"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/use-api";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    credits: "100",
    features: ["Paraphraser (4 modes)", "Grammar Checker", "Summarizer", "Translator (20 languages)", "Basic Health Score"],
    current: true,
  },
  {
    name: "Pro",
    price: "$19",
    credits: "1,000",
    features: [
      "All Free features",
      "AI Humanizer (bypass-grade)",
      "AI Detector",
      "SEO Optimizer",
      "Plagiarism Checker",
      "Writing DNA",
      "Priority processing",
    ],
    current: false,
    popular: true,
  },
  {
    name: "Team",
    price: "$49",
    credits: "5,000",
    features: [
      "All Pro features",
      "Multi-Agent Studio",
      "Content Transformation",
      "Team Workspace",
      "Shared Writing DNA",
      "API Access",
      "Dedicated support",
    ],
    current: false,
  },
];

export default function BillingPage() {
  const creditsQuery = useCredits();

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing & Plans</h1>
          <p className="text-muted-foreground">Manage your subscription and credits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.popular && (
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      Popular
                    </span>
                  )}
                  {creditsQuery.data?.tier?.toLowerCase() === plan.name.toLowerCase() && (
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                      Current
                    </span>
                  )}
                </div>
                <CardDescription>
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <span className="font-medium">{plan.credits}</span> credits/month
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={creditsQuery.data?.tier?.toLowerCase() === plan.name.toLowerCase()}
                >
                  {creditsQuery.data?.tier?.toLowerCase() === plan.name.toLowerCase()
                    ? "Current Plan"
                    : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Credit Packages</CardTitle>
            <CardDescription>Purchase additional credits as needed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border text-center hover:border-primary cursor-pointer transition-colors">
                <div className="text-2xl font-bold">500</div>
                <div className="text-sm text-muted-foreground mb-2">Credits</div>
                <div className="font-medium">$9.99</div>
              </div>
              <div className="p-4 rounded-lg border text-center hover:border-primary cursor-pointer transition-colors">
                <div className="text-2xl font-bold">1,000</div>
                <div className="text-sm text-muted-foreground mb-2">Credits</div>
                <div className="font-medium">$17.99</div>
              </div>
              <div className="p-4 rounded-lg border text-center hover:border-primary cursor-pointer transition-colors">
                <div className="text-2xl font-bold">5,000</div>
                <div className="text-sm text-muted-foreground mb-2">Credits</div>
                <div className="font-medium">$79.99</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button, Badge, Card, CardContent } from "@/components/ui";
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
  Check,
  Star,
  Zap,
  Menu,
  X,
  Play,
  Quote,
  ChevronDown,
  PenLine,
  Wand2,
  SendHorizontal,
} from "lucide-react";

const demoTransforms = [
  {
    label: "Paraphraser",
    before: "The company's quarterly earnings exceeded analyst expectations.",
    after: "Analysts were caught off guard as the company's quarterly earnings soared past projections.",
  },
  {
    label: "Humanizer",
    before: "Furthermore, it is imperative to note that efficiency gains were substantial.",
    after: "Honestly, the efficiency gains were huge — and that's worth pointing out.",
  },
  {
    label: "Grammar",
    before: "She dont know where her keys is at.",
    after: "She doesn't know where her keys are.",
  },
];

const steps = [
  {
    icon: PenLine,
    title: "Paste or write your text",
    description: "Drop in a draft, an email, an essay — anything. No formatting required.",
  },
  {
    icon: Wand2,
    title: "Pick an engine, hit run",
    description: "Paraphrase, humanize, check grammar, translate, or run all 8 in Agent Studio.",
  },
  {
    icon: SendHorizontal,
    title: "Get a result you can trust",
    description: "Real scores, real corrections, real output — never a placeholder or a guess.",
  },
];

const bentoFeatures = [
  {
    icon: Feather,
    title: "Intelligent Paraphrasing",
    description: "8 distinct modes, from formal to creative, that preserve your meaning while finding a new voice.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    span: "lg:col-span-2",
  },
  {
    icon: Dna,
    title: "Writing DNA",
    description: "Learns your personal style fingerprint and applies it across every engine.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    span: "",
  },
  {
    icon: ShieldCheck,
    title: "AI Detector",
    description: "Sentence-level probability scoring with highlighted regions, not a single opaque number.",
    color: "text-green-400",
    bg: "bg-green-400/10",
    span: "",
  },
  {
    icon: FlaskConical,
    title: "Multi-Agent Studio",
    description: "Supervisor-coordinated agents iterate on your document together until it hits your target score.",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    span: "lg:col-span-2",
  },
  {
    icon: SpellCheck,
    title: "Grammar Excellence",
    description: "Real corrections powered by Gemini, not a fixed typo dictionary.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    span: "",
  },
  {
    icon: Languages,
    title: "Global Translator",
    description: "30+ languages, 5 tone presets, context preserved.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    span: "",
  },
];

const tools = [
  { name: "Paraphraser", icon: Feather, color: "text-blue-400", bg: "bg-blue-400/10", href: "/tools/paraphraser" },
  { name: "Humanizer", icon: SparklesIcon, color: "text-purple-400", bg: "bg-purple-400/10", href: "/tools/humanizer" },
  { name: "AI Detector", icon: ShieldCheck, color: "text-green-400", bg: "bg-green-400/10", href: "/tools/detector" },
  { name: "Grammar", icon: SpellCheck, color: "text-orange-400", bg: "bg-orange-400/10", href: "/tools/grammar" },
  { name: "Summarizer", icon: FileText, color: "text-cyan-400", bg: "bg-cyan-400/10", href: "/tools/summarizer" },
  { name: "Translator", icon: Languages, color: "text-pink-400", bg: "bg-pink-400/10", href: "/tools/translator" },
  { name: "SEO Optimizer", icon: Search, color: "text-yellow-400", bg: "bg-yellow-400/10", href: "/tools/seo" },
  { name: "Writing DNA", icon: Dna, color: "text-emerald-400", bg: "bg-emerald-400/10", href: "/tools/writing-dna" },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Content Director at TechFlow",
    avatar: "SC",
    content: "Paraflow has completely transformed our content workflow. The paraphrasing quality is unmatched, and the Writing DNA feature ensures our brand voice stays consistent across all writers.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Freelance Copywriter",
    avatar: "MJ",
    content: "The AI Humanizer is a game-changer. I can now take AI drafts and make them sound genuinely human. My clients are amazed at how natural the results are.",
    rating: 5,
  },
  {
    name: "Elena Rodriguez",
    role: "Academic Researcher",
    avatar: "ER",
    content: "As a researcher, I need to maintain academic integrity while improving clarity. Paraflow's grammar tool and translator have become essential parts of my writing process.",
    rating: 5,
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: 0,
    credits: 100,
    features: [
      "100 credits monthly",
      "Basic paraphrasing",
      "Grammar checking",
      "5,000 words per month",
      "Email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: 19,
    credits: 1000,
    features: [
      "1,000 credits monthly",
      "All paraphrasing modes",
      "Advanced grammar insights",
      "Unlimited words",
      "Priority support",
      "Writing DNA access",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Team",
    price: 49,
    credits: 5000,
    features: [
      "5,000 credits monthly",
      "Everything in Pro",
      "Team collaboration",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const faqs = [
  {
    question: "How does the credit system work?",
    answer: "Each AI-powered action (paraphrasing, humanizing, etc.) uses credits from your balance. New users get 100 free credits. Higher plans offer more credits with rollover options.",
  },
  {
    question: "What makes Paraflow different from other AI writing tools?",
    answer: "Paraflow combines multiple AI models with our proprietary Writing DNA system that learns your unique style. Unlike generic tools, we provide personalized results that sound like you.",
  },
  {
    question: "Is my content private and secure?",
    answer: "Absolutely. All your content is encrypted and never used to train AI models. You retain full ownership of everything you create with Paraflow.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time with no penalties. Your credits remain available until the end of your billing period.",
  },
];

function HeroDemoPanel() {
  const reduceMotion = useReducedMotion();
  const [activeDemo, setActiveDemo] = useState(0);
  const [showAfter, setShowAfter] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 150, damping: 20 });

  useEffect(() => {
    setShowAfter(false);
    const revealTimer = setTimeout(() => setShowAfter(true), 1100);
    const nextTimer = setTimeout(() => setActiveDemo((prev) => (prev + 1) % demoTransforms.length), 3600);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(nextTimer);
    };
  }, [activeDemo]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const demo = demoTransforms[activeDemo];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: reduceMotion ? 0 : rotateX,
        rotateY: reduceMotion ? 0 : rotateY,
        transformPerspective: 1200,
      }}
      className="relative mx-auto w-full max-w-xl"
    >
      <div className="glass rounded-2xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/60">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={demo.label}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="text-xs font-medium text-muted-foreground"
              >
                {demo.label}
              </motion.span>
            </AnimatePresence>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>

        <div className="p-6 space-y-4 min-h-[220px]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Before</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={"before-" + activeDemo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {demo.before}
              </motion.p>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 text-primary">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
            <Zap className="w-3.5 h-3.5" />
            <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary mb-2">After</p>
            <div className="min-h-[3.5rem]">
              <AnimatePresence mode="wait">
                {showAfter && (
                  <motion.p
                    key={"after-" + activeDemo}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium leading-relaxed"
                  >
                    {demo.after}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          {demoTransforms.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeDemo ? "w-6 bg-primary" : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Floating badge accents for depth */}
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-4 -right-4 glass rounded-xl px-3 py-2 shadow-lg border border-border/50 hidden sm:flex items-center gap-2"
      >
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <span className="text-xs font-medium">98% Human Score</span>
      </motion.div>
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -bottom-4 -left-4 glass rounded-xl px-3 py-2 shadow-lg border border-border/50 hidden sm:flex items-center gap-2"
      >
        <Dna className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium">Style matched</span>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.97]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border/50" />
        <nav className="relative container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Paraflow AI</span>
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </Link>
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#tools" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Tools
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Get Started Free
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-accent"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
            >
              <div className="container mx-auto px-4 py-4 space-y-4">
                <Link href="#how-it-works" className="block py-2 text-sm font-medium">How it Works</Link>
                <Link href="#features" className="block py-2 text-sm font-medium">Features</Link>
                <Link href="#tools" className="block py-2 text-sm font-medium">Tools</Link>
                <Link href="#pricing" className="block py-2 text-sm font-medium">Pricing</Link>
                <Link href="#faq" className="block py-2 text-sm font-medium">FAQ</Link>
                <div className="pt-4 border-t border-border/50 flex gap-4">
                  <Link href="/login" className="flex-1">
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], rotate: [0, -5, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]"
          />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative container mx-auto px-4 lg:px-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Badge variant="gradient" className="mb-6 px-4 py-1.5 text-sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Introducing Writing DNA
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
              >
                From First Draft to{" "}
                <span className="gradient-text">Final Form</span>
                {" "}— Intelligently.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0"
              >
                The unified Writing Intelligence Platform that paraphrases, humanizes,
                detects AI, optimizes SEO, and learns your unique style.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-14"
              >
                <Link href="/register">
                  <Button size="xl" className="gap-2 w-full sm:w-auto">
                    <Zap className="w-5 h-5" />
                    Start Free — 100 Credits
                  </Button>
                </Link>
                <Link href="/tools/paraphraser">
                  <Button size="xl" variant="outline" className="gap-2 w-full sm:w-auto">
                    <Play className="w-5 h-5" />
                    Try Demo
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex items-center justify-center lg:justify-start gap-8"
              >
                {[
                  { value: "50K+", label: "Active Users" },
                  { value: "10M+", label: "Words Processed" },
                  { value: "4.9", label: "User Rating" },
                ].map((stat, i) => (
                  <div key={i} className="text-center lg:text-left">
                    <p className="text-xl lg:text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs lg:text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <HeroDemoPanel />
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </motion.div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 lg:py-24 border-y border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="secondary" className="mb-4">How it Works</Badge>
            <h2 className="text-3xl lg:text-4xl font-bold">Three steps to better writing</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10 max-w-5xl mx-auto relative">
            <div className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40" />
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-background border border-primary/30 shadow-lg shadow-primary/10 mx-auto mb-5 flex items-center justify-center relative z-10">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — bento grid */}
      <section id="features" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Everything You Need to Write{" "}
              <span className="gradient-text">Brilliantly</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Premium AI-powered tools designed for writers who demand excellence
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[1fr]">
            {bentoFeatures.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={feature.span}
              >
                <Card hoverable className="h-full">
                  <CardContent className="p-6 h-full flex flex-col">
                    <div className={cn("w-14 h-14 rounded-2xl mb-4 flex items-center justify-center", feature.bg)}>
                      <feature.icon className={cn("w-7 h-7", feature.color)} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Showcase */}
      <section id="tools" className="py-20 lg:py-32 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Tools</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              8 Integrated AI Writing Tools
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A complete toolkit for every stage of your writing journey
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={tool.href}>
                  <Card hoverable className="group h-full overflow-hidden relative">
                    <CardContent className="p-6 text-center relative z-10">
                      <div className={cn("w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110", tool.bg)}>
                        <tool.icon className={cn("w-7 h-7", tool.color)} />
                      </div>
                      <h3 className="font-medium">{tool.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Multi-Agent Studio Feature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12"
          >
            <Card className="overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 border-primary/20">
              <CardContent className="p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-center lg:text-left flex-1">
                    <h3 className="text-2xl font-bold mb-2">Multi-Agent Studio</h3>
                    <p className="text-muted-foreground mb-4">
                      Supervisor-coordinated AI agents (Grammar, SEO, Humanizer, Tone) collaborate on your document
                      until it reaches target quality. Multiple agents, one unified result.
                    </p>
                    <Link href="/tools/agent-studio">
                      <Button className="gap-2">
                        Try Agent Studio <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Loved by Writers Everywhere
            </h2>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <Card className="relative overflow-hidden">
              <CardContent className="p-8 lg:p-12">
                <Quote className="w-12 h-12 text-primary/20 absolute top-4 left-4" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTestimonial}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    <div className="flex justify-center mb-4">
                      {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                      ))}
                    </div>
                    <p className="text-xl lg:text-2xl text-center mb-8 leading-relaxed">
                      &ldquo;{testimonials[activeTestimonial].content}&rdquo;
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white font-medium">
                        {testimonials[activeTestimonial].avatar}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{testimonials[activeTestimonial].name}</p>
                        <p className="text-sm text-muted-foreground">{testimonials[activeTestimonial].role}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="flex justify-center gap-2 mt-8">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTestimonial(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i === activeTestimonial ? "bg-primary w-8" : "bg-muted hover:bg-muted-foreground"
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-32 bg-gradient-to-b from-transparent via-success/5 to-transparent">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <Card className={cn("h-full relative", plan.popular && "border-primary shadow-lg shadow-primary/10")}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="gradient">Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">{plan.credits} credits included</p>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm">
                          <Check className="w-4 h-4 text-success" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link href="/register">
                      <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  hoverable
                  className={cn("cursor-pointer", openFaq === i && "border-primary")}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{faq.question}</h3>
                      <motion.div
                        animate={{ rotate: openFaq === i ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </div>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-muted-foreground text-sm mt-4"
                        >
                          {faq.answer}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <Card className="overflow-hidden bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/20 border-primary/20">
            <CardContent className="p-8 lg:p-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl lg:text-5xl font-bold mb-4">
                  Ready to Transform Your Writing?
                </h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of writers who have elevated their craft with Paraflow AI.
                  Get 100 free credits when you sign up today.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register">
                    <Button size="xl" className="gap-2">
                      <Zap className="w-5 h-5" />
                      Get Started Free
                    </Button>
                  </Link>
                  <Link href="/tools/paraphraser">
                    <Button size="xl" variant="outline">
                      Try Demo First
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Paraflow AI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Paraflow AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

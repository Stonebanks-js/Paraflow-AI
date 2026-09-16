"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from "@/components/ui";
import {
  useHistory,
  useDeleteHistoryItem,
  useProjects,
  useCreateProject,
  useDeleteProject,
} from "@/hooks/use-api";
import type { HistoryItem } from "@/types";
import { cn } from "@/lib/utils";
import {
  Clock,
  Trash2,
  Feather,
  SparklesIcon,
  ShieldCheck,
  SpellCheck,
  FileText,
  Languages,
  Search,
  Dna,
  FlaskConical,
  FolderPlus,
  Folder,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const TOOL_ICONS: Record<string, typeof Feather> = {
  paraphraser: Feather,
  humanizer: SparklesIcon,
  detector: ShieldCheck,
  grammar: SpellCheck,
  summarizer: FileText,
  translator: Languages,
  seo: Search,
  "writing-dna": Dna,
  agent_studio: FlaskConical,
};

const TOOL_LABELS: Record<string, string> = {
  paraphraser: "Paraphraser",
  humanizer: "Humanizer",
  detector: "AI Detector",
  grammar: "Grammar",
  summarizer: "Summarizer",
  translator: "Translator",
  seo: "SEO Optimizer",
  agent_studio: "Multi-Agent Studio",
};

function groupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This week";
  if (diffDays < 30) return "This month";
  return "Older";
}

export default function HistoryPage() {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const historyQuery = useHistory(activeProject);
  const deleteItem = useDeleteHistoryItem();
  const projectsQuery = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const items = historyQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];

  const grouped = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {};
    for (const item of items) {
      const label = groupLabel(item.created_at);
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    }
    return groups;
  }, [items]);

  const groupOrder = ["Today", "Yesterday", "This week", "This month", "Older"];

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    await createProject.mutateAsync(name);
    setNewProjectName("");
    setNewProjectOpen(false);
  };

  return (
    <AppShell>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">History</h1>
            <p className="text-sm text-muted-foreground">Everything you've run, automatically organized.</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setNewProjectOpen(true)}>
            <FolderPlus className="w-4 h-4" />
            New project
          </Button>
        </div>

        {/* Project filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveProject(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              activeProject === null
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground border-border hover:bg-accent"
            )}
          >
            All history
          </button>
          {projects.map((p) => (
            <div key={p.id} className="group relative">
              <button
                onClick={() => setActiveProject(p.id)}
                className={cn(
                  "flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  activeProject === p.id
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "text-muted-foreground border-border hover:bg-accent"
                )}
              >
                <Folder className="w-3 h-3" />
                {p.name}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProject.mutate(p.id, {
                    onSuccess: () => activeProject === p.id && setActiveProject(null),
                  });
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {historyQuery.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!historyQuery.isLoading && items.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No history yet</h3>
                <p className="text-sm text-muted-foreground">
                  {activeProject
                    ? "Nothing in this project yet."
                    : "Run any tool and it'll show up here automatically."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {groupOrder
            .filter((g) => grouped[g]?.length)
            .map((group) => (
              <div key={group}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {group}
                </h2>
                <div className="space-y-2">
                  {grouped[group].map((item, i) => {
                    const Icon = TOOL_ICONS[item.tool_name] || FileText;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                      >
                        <Card hoverable>
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {item.title || TOOL_LABELS[item.tool_name] || item.tool_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {TOOL_LABELS[item.tool_name] || item.tool_name} ·{" "}
                                {new Date(item.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            {item.status === "completed" ? (
                              <Badge variant="success" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Done
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="w-3 h-3" /> Failed
                              </Badge>
                            )}
                            <button
                              onClick={() => deleteItem.mutate(item.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || createProject.isPending}>
              {createProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

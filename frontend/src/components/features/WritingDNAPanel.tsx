"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWritingDNA, useUpdateWritingDNA, useWritingDNAProfile } from "@/hooks/use-api";
import { Dna, Upload, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

const MATURITY_THRESHOLDS = { developing: 0, active: 5, mature: 15 };

export function WritingDNAPanel() {
  const [samples, setSamples] = useState<string[]>(["", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const enrollMutation = useWritingDNA();
  const updateMutation = useUpdateWritingDNA();
  const profileQuery = useWritingDNAProfile();
  const profile = profileQuery.data;
  const isSaving = enrollMutation.isPending || updateMutation.isPending;

  const validCount = samples.filter((s) => s.trim().length > 50).length;

  const handleAddSample = () => {
    if (samples.length >= 10) return;
    setSamples([...samples, ""]);
  };

  const handleRemoveSample = (index: number) => {
    if (samples.length <= 1) return;
    setSamples(samples.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const validSamples = samples.filter((s) => s.trim().length > 50);
    if (validSamples.length < 1) {
      setError("Each sample must be at least 50 characters. Add more text to at least one sample.");
      return;
    }
    setError(null);
    try {
      if (profile) {
        await updateMutation.mutateAsync(validSamples);
      } else {
        await enrollMutation.mutateAsync(validSamples);
      }
      // Neither the mutation's own onSuccess invalidateQueries() nor a
      // plain profileQuery.refetch() reliably updated the UI here --
      // reproduced live: the enroll succeeded (200, verified via direct
      // fetch), but the page kept showing the pre-enroll form until a
      // manual reload. Most likely cause: the query had settled into an
      // error state from its initial pre-enroll 404, and refetch() on an
      // already-observed query in that state can resolve without
      // actually starting a new network request. resetQueries() is the
      // more forceful operation -- it clears the cached error state
      // outright and refetches any actively-observed query, which is
      // exactly this one.
      await queryClient.resetQueries({ queryKey: ["writing-dna", "profile"] });
      setSamples(["", "", ""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Writing DNA update failed");
    }
  };

  const radarData = profile
    ? [
        { subject: "Vocabulary", value: profile.radar_chart_data.vocabulary, fullMark: 100 },
        { subject: "Formality", value: profile.radar_chart_data.formality, fullMark: 100 },
        { subject: "Sentence", value: profile.radar_chart_data.sentence_length, fullMark: 100 },
        { subject: "Tone", value: profile.radar_chart_data.tone, fullMark: 100 },
        { subject: "Burstiness", value: profile.radar_chart_data.burstiness, fullMark: 100 },
        { subject: "Structure", value: profile.radar_chart_data.structure, fullMark: 100 },
      ]
    : [];

  const nextMilestone = profile?.maturity === "developing" ? MATURITY_THRESHOLDS.active
    : profile?.maturity === "active" ? MATURITY_THRESHOLDS.mature
    : null;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dna className="w-5 h-5 text-emerald-500" />
              Writing DNA
            </CardTitle>
            <CardDescription>
              {profile
                ? "Add more samples to refine your style fingerprint further"
                : "Build your personal style fingerprint for personalized AI output"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!profile && (
              <p className="text-sm text-muted-foreground">
                Upload at least 3 writing samples (emails, essays, articles) to create your Writing DNA profile.
                The more samples you provide, the more accurate your style fingerprint becomes.
              </p>
            )}

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {samples.map((sample, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Sample {i + 1}</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {sample.trim().length}/50 min
                        </span>
                        {samples.length > 1 && (
                          <button
                            onClick={() => handleRemoveSample(i)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      value={sample}
                      onChange={(e) => {
                        const newSamples = [...samples];
                        newSamples[i] = e.target.value;
                        setSamples(newSamples);
                      }}
                      placeholder={`Paste writing sample ${i + 1} here (minimum 50 characters)...`}
                      style={{ minHeight: "100px" }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddSample} disabled={samples.length >= 10}>
                <Plus className="w-4 h-4 mr-1" /> Add Sample
              </Button>
              <span className="text-xs text-muted-foreground">{validCount} of {samples.length} ready</span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={validCount < 1 || isSaving}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {profile ? "Add to Writing DNA" : "Create Writing DNA"}
                </>
              )}
            </Button>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Your Style Profile</CardTitle>
                    <CardDescription>
                      Maturity: <span className="capitalize font-medium">{profile.maturity}</span>
                    </CardDescription>
                  </div>
                  {nextMilestone !== null && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      Add more samples to reach the next maturity level
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar
                          name="Your Style"
                          dataKey="value"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Style Guide</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vocabulary</span>
                        <span className="font-medium capitalize">{profile.style_prompt.vocabulary}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sentence Length</span>
                        <span className="font-medium">{profile.style_prompt.sentence_length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tone</span>
                        <span className="font-medium capitalize">{profile.style_prompt.tone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contractions</span>
                        <span className="font-medium">{profile.style_prompt.contractions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transitions</span>
                        <span className="font-medium">{profile.style_prompt.transitions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lists</span>
                        <span className="font-medium">{profile.style_prompt.lists}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Your Writing DNA is automatically applied to paraphrasing, humanization,
                        and grammar correction to match your personal style.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

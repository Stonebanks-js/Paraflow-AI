"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useWritingDNA, useWritingDNAProfile } from "@/hooks/use-api";
import { Dna, Upload, Loader2, CheckCircle } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

export function WritingDNAPanel() {
  const [samples, setSamples] = useState<string[]>(["", "", ""]);

  const enrollMutation = useWritingDNA();
  const profileQuery = useWritingDNAProfile();

  const handleEnroll = async () => {
    const validSamples = samples.filter((s) => s.trim().length > 50);
    if (validSamples.length < 1) return;
    await enrollMutation.mutateAsync(validSamples);
  };

  const profile = profileQuery.data;

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-emerald-500" />
            Writing DNA
          </CardTitle>
          <CardDescription>
            Build your personal style fingerprint for personalized AI output
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload at least 3 writing samples (emails, essays, articles) to create your Writing DNA profile.
            The more samples you provide, the more accurate your style fingerprint becomes.
          </p>

          <div className="space-y-4">
            {samples.map((sample, i) => (
              <div key={i}>
                <label className="text-sm font-medium mb-2 block">Sample {i + 1}</label>
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
              </div>
            ))}
          </div>

          <Button
            onClick={handleEnroll}
            disabled={samples.filter((s) => s.trim().length > 50).length < 1}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {enrollMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Create Writing DNA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Your Style Profile</CardTitle>
            <CardDescription>
              Maturity: <span className="capitalize font-medium">{profile.maturity}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-[300px]">
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
              </div>

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
      )}
    </div>
  );
}
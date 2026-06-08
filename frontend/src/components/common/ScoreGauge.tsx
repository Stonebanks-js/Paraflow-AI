"use client";

import { cn, getScoreColor, getScoreBgColor } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreGauge({ score, size = "md", showLabel = true }: ScoreGaugeProps) {
  const colorClass = getScoreColor(score);
  const bgClass = getScoreBgColor(score);

  const sizes = {
    sm: { dimension: 80, stroke: 6, fontSize: "text-lg" },
    md: { dimension: 120, stroke: 8, fontSize: "text-2xl" },
    lg: { dimension: 160, stroke: 10, fontSize: "text-4xl" },
  };

  const { dimension, stroke, fontSize } = sizes[size];
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dimension} height={dimension} className="transform -rotate-90">
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted"
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(bgClass, "transition-all duration-500")}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn(fontSize, "font-bold", colorClass)}>{score}</span>
        {showLabel && (
          <span className="text-xs text-muted-foreground">/ 100</span>
        )}
      </div>
    </div>
  );
}

interface HealthScoreCardProps {
  score: number;
  dimensions: {
    grammar: number;
    readability: number;
    originality: number;
    human_likeness: number;
    seo: number;
    tone: number;
  };
  recommendations: string[];
}

export function HealthScoreCard({
  score,
  dimensions,
  recommendations,
}: HealthScoreCardProps) {
  const dimensionLabels: Record<string, string> = {
    grammar: "Grammar",
    readability: "Readability",
    originality: "Originality",
    human_likeness: "Human-likeness",
    seo: "SEO",
    tone: "Tone",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <ScoreGauge score={score} size="lg" />
      </div>

      <div className="space-y-3">
        {Object.entries(dimensions).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{dimensionLabels[key]}</span>
              <span className={getScoreColor(value)}>{value}/100</span>
            </div>
            <Progress value={value} className="h-2" />
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
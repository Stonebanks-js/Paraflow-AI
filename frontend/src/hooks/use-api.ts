import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUserStore } from '@/stores';
import type {
  ParaphraseResponse,
  HumanizeResponse,
  DetectResponse,
  GrammarResponse,
  SummarizeResponse,
  TranslateResponse,
  SEOResponse,
  WritingDNAProfile,
  AgentStudioResponse,
  HealthScore,
} from '@/types';

export function useHealthScore(text: string | null) {
  const token = useUserStore((s) => s.token);
  return useQuery<HealthScore>({
    queryKey: ['health', text],
    queryFn: () => api.get('/v1/health/score?text=' + encodeURIComponent(text || ''), token || undefined),
    enabled: !!text && text.length > 10,
  });
}

export function useParaphrase() {
  const token = useUserStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { text: string; mode: string; strength: number }) =>
      api.post<ParaphraseResponse>('/v1/tools/paraphrase', data, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
}

export function useHumanize() {
  const token = useUserStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { text: string; target_pass_rate: number }) =>
      api.post<HumanizeResponse>('/v1/tools/humanize', data, token || undefined),
  });
}

export function useDetect() {
  const token = useUserStore((s) => s.token);
  return useMutation({
    mutationFn: (text: string) =>
      api.post<DetectResponse>('/v1/tools/detect', { text }, token || undefined),
  });
}

export function useGrammar() {
  const token = useUserStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { text: string; language?: string }) =>
      api.post<GrammarResponse>('/v1/tools/grammar', data, token || undefined),
  });
}

export function useSummarize() {
  const token = useUserStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { text: string; style: string; max_length?: number }) =>
      api.post<SummarizeResponse>('/v1/tools/summarize', data, token || undefined),
  });
}

export function useTranslate() {
  const token = useUserStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { text: string; source_lang: string; target_lang: string; preserve_tone: boolean }) =>
      api.post<TranslateResponse>('/v1/tools/translate', data, token || undefined),
  });
}

export function useSEO() {
  const token = useUserStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { text: string; target_keywords: string[]; content_type: string }) =>
      api.post<SEOResponse>('/v1/tools/seo', data, token || undefined),
  });
}

export function useWritingDNA() {
  const token = useUserStore((s) => s.token);
  return useMutation({
    mutationFn: (samples: string[]) =>
      api.post<{ profile_id: string; status: string }>('/v1/writing-dna/enroll', { samples }, token || undefined),
  });
}

export function useWritingDNAProfile() {
  const token = useUserStore((s) => s.token);
  return useQuery<WritingDNAProfile>({
    queryKey: ['writing-dna', 'profile'],
    queryFn: () => api.get('/v1/writing-dna/profile', token || undefined),
    enabled: !!token,
  });
}

export function useAgentStudio() {
  const token = useUserStore((s) => s.token);
  return useMutation({
    mutationFn: (data: { text: string; target_score: number; max_iterations: number; active_agents: string[] }) =>
      api.post<AgentStudioResponse>('/v1/agents/studio', data, token || undefined),
  });
}

export function useCredits() {
  const token = useUserStore((s) => s.token);
  return useQuery<{ balance: number; tier: string }>({
    queryKey: ['credits'],
    queryFn: () => api.get('/v1/users/credits', token || undefined),
    enabled: !!token,
    refetchInterval: 30000,
  });
}
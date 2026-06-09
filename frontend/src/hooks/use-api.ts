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
  return useQuery<HealthScore>({
    queryKey: ['health', text],
    queryFn: () => api.get('/v1/health/score?text=' + encodeURIComponent(text || ''), useUserStore.getState().token || undefined),
    enabled: !!text && text.length > 10,
  });
}

export function useParaphrase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { text: string; mode: string; strength: number }) => {
      const currentToken = useUserStore.getState().token;
      return api.post<ParaphraseResponse>('/v1/tools/paraphrase', data, currentToken || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
}

export function useHumanize() {
  return useMutation({
    mutationFn: (data: { text: string; target_pass_rate: number }) =>
      api.post<HumanizeResponse>('/v1/tools/humanize', data, useUserStore.getState().token || undefined),
  });
}

export function useDetect() {
  return useMutation({
    mutationFn: (text: string) =>
      api.post<DetectResponse>('/v1/tools/detect', { text }, useUserStore.getState().token || undefined),
  });
}

export function useGrammar() {
  return useMutation({
    mutationFn: (data: { text: string; language?: string }) =>
      api.post<GrammarResponse>('/v1/tools/grammar', data, useUserStore.getState().token || undefined),
  });
}

export function useSummarize() {
  return useMutation({
    mutationFn: (data: { text: string; style: string; max_length?: number }) =>
      api.post<SummarizeResponse>('/v1/tools/summarize', data, useUserStore.getState().token || undefined),
  });
}

export function useTranslate() {
  return useMutation({
    mutationFn: (data: { text: string; source_lang: string; target_lang: string; preserve_tone: boolean }) =>
      api.post<TranslateResponse>('/v1/tools/translate', data, useUserStore.getState().token || undefined),
  });
}

export function useSEO() {
  return useMutation({
    mutationFn: (data: { text: string; target_keywords: string[]; content_type: string }) =>
      api.post<SEOResponse>('/v1/tools/seo', data, useUserStore.getState().token || undefined),
  });
}

export function useWritingDNA() {
  return useMutation({
    mutationFn: (samples: string[]) =>
      api.post<{ profile_id: string; status: string }>('/v1/writing-dna/enroll', { samples }, useUserStore.getState().token || undefined),
  });
}

export function useWritingDNAProfile() {
  return useQuery<WritingDNAProfile>({
    queryKey: ['writing-dna', 'profile'],
    queryFn: () => api.get('/v1/writing-dna/profile', useUserStore.getState().token || undefined),
    enabled: !!useUserStore.getState().token,
  });
}

export function useAgentStudio() {
  return useMutation({
    mutationFn: (data: { text: string; target_score: number; max_iterations: number; active_agents: string[] }) =>
      api.post<AgentStudioResponse>('/v1/agents/studio', data, useUserStore.getState().token || undefined),
  });
}

export function useCredits() {
  return useQuery<{ balance: number; tier: string }>({
    queryKey: ['credits'],
    queryFn: () => api.get('/v1/users/credits', useUserStore.getState().token || undefined),
    enabled: !!useUserStore.getState().token,
    refetchInterval: 30000,
  });
}
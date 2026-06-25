import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
    queryFn: () => api.get('/v1/health/score?text=' + encodeURIComponent(text || '')),
    enabled: !!text && text.length > 10,
  });
}

export function useParaphrase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; mode: string; strength: number }) =>
      api.post<ParaphraseResponse>('/v1/tools/paraphrase', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function useHumanize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; target_pass_rate: number }) =>
      api.post<HumanizeResponse>('/v1/tools/humanize', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useDetect() {
  return useMutation({
    mutationFn: (text: string) =>
      api.post<DetectResponse>('/v1/tools/detect', { text }),
  });
}

export function useGrammar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; language?: string }) =>
      api.post<GrammarResponse>('/v1/tools/grammar', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useSummarize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; style: string; max_length?: number }) =>
      api.post<SummarizeResponse>('/v1/tools/summarize', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useTranslate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; source_lang: string; target_lang: string; preserve_tone: boolean }) =>
      api.post<TranslateResponse>('/v1/tools/translate', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useSEO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; target_keywords: string[]; content_type: string }) =>
      api.post<SEOResponse>('/v1/tools/seo', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useWritingDNA() {
  return useMutation({
    mutationFn: (samples: string[]) =>
      api.post<{ profile_id: string; status: string }>('/v1/writing-dna/enroll', { samples }),
  });
}

export function useWritingDNAProfile() {
  return useQuery<WritingDNAProfile>({
    queryKey: ['writing-dna', 'profile'],
    queryFn: () => api.get('/v1/writing-dna/profile'),
  });
}

export function useAgentStudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { text: string; target_score: number; max_iterations: number; active_agents: string[] }) =>
      api.post<AgentStudioResponse>('/v1/agents/studio', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credits'] }),
  });
}

export function useCredits() {
  return useQuery<{ balance: number; tier: string }>({
    queryKey: ['credits'],
    queryFn: () => api.get('/v1/users/credits'),
    refetchInterval: 30000,
  });
}

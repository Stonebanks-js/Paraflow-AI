import { useState, useEffect } from 'react';
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
  // Debounce: without this, a distinct queryKey (and a distinct request)
  // fires on every keystroke once text passes the length threshold, which
  // can flood the backend with dozens of concurrent requests for a single
  // paragraph being typed.
  const [debouncedText, setDebouncedText] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(text), 800);
    return () => clearTimeout(timer);
  }, [text]);

  return useQuery<HealthScore>({
    queryKey: ['health', debouncedText],
    // POST + JSON body, not a GET query string -- a full user paragraph in
    // a URL can exceed proxy/CDN URL length limits (HTTP 414).
    queryFn: () => api.post('/v1/health/score', { text: debouncedText || '' }),
    enabled: !!debouncedText && debouncedText.length > 10,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.post<DetectResponse>('/v1/tools/detect', { text }),
    // Every other tool mutation invalidates ['credits'] on success; this
    // one didn't, found via live testing -- the real backend balance was
    // correct (deducted properly) but the sidebar/dashboard kept showing
    // the pre-Detector value until something else happened to refetch
    // (the 30s poll interval, or another engine's mutation succeeding).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credits'] }),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (samples: string[]) =>
      api.post<{ profile_id: string; status: string }>('/v1/writing-dna/enroll', { samples }),
    // Without this, a successful enroll doesn't refresh the profile query
    // (still cached from its initial 404-before-first-enroll fetch), so
    // the new profile never appears until the user manually reloads.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['writing-dna', 'profile'] }),
  });
}

export function useUpdateWritingDNA() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (samples: string[]) =>
      api.post<{ profile_id: string; status: string }>('/v1/writing-dna/update', { samples }),
    // Cumulative on the backend (adds to the existing sample_count rather
    // than resetting it like /enroll would) -- used once a profile already
    // exists, so repeat use actually grows toward "active"/"mature"
    // instead of being capped at whatever a single enroll call submitted.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['writing-dna', 'profile'] }),
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

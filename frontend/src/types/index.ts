export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'free' | 'pro' | 'team';
  onboarding_done: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface HealthScore {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
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

export interface ToolJob {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  output?: string;
  error?: string;
  credits_used?: number;
}

export interface ParaphraseResponse extends ToolJob {
  health_score?: number;
  word_count_diff?: number;
}

export interface DetectionResult {
  score: number;
  verdict: 'human' | 'ai' | 'mixed';
  confidence: number;
  highlighted_spans: Array<{
    start: number;
    end: number;
    probability: number;
    text: string;
  }>;
  classifier_breakdown?: {
    perplexity: number;
    burstiness: number;
    semantic: number;
    lexical_diversity: number;
  };
}

export interface GrammarIssue {
  type: string;
  message: string;
  position: number;
  length: number;
  severity: 'error' | 'warning' | 'info';
  suggestions: string[];
}

export interface GrammarResponse extends ToolJob {
  corrected_text?: string;
  issues: GrammarIssue[];
  checked_by?: 'gemini' | 'rule_based_only';
}

export interface HumanizeResponse extends ToolJob {
  output?: string;
  detection_scores?: {
    ai_likelihood_before: number | null;
    ai_likelihood_after: number | null;
    source: string;
  };
}

export interface DetectResponse extends ToolJob {
  result?: DetectionResult;
}

export interface SummarizeResponse extends ToolJob {
  summary?: string;
  key_points: string[];
}

export interface TranslateResponse extends ToolJob {
  translated_text?: string;
  confidence?: number;
}

export interface SEOAnalysis {
  keyword_density: Record<string, number>;
  readability_score: number;
  title_quality: number;
  meta_quality?: number;
  suggestions: string[];
  meta_description_suggestion?: string;
  heading_structure?: { count: number; has_headings: boolean; needed: boolean };
  keyword_in_introduction?: boolean;
  word_count?: number;
  semantic_keyword_suggestions?: string[];
}

export interface SEOResponse extends ToolJob {
  analysis?: SEOAnalysis;
  health_score?: number;
}

export interface WritingDNAProfile {
  profile_id: string;
  radar_chart_data: {
    vocabulary: number;
    formality: number;
    sentence_length: number;
    tone: number;
    burstiness: number;
    rhythm: number;
    structure: number;
  };
  style_prompt: {
    vocabulary: string;
    sentence_length: string;
    tone: string;
    contractions: string;
    punctuation: string;
    transitions: string;
    lists: string;
  };
  maturity: 'developing' | 'active' | 'mature';
}

export interface AgentMessage {
  agent: string;
  message: string;
  timestamp: string;
}

export interface AgentIteration {
  iteration: number;
  health_score: number;
  agents_run: string[];
  changes_made: number;
  messages: AgentMessage[];
}

export interface AgentStudioResponse {
  session_id: string;
  status: string;
  final_text?: string;
  initial_score: number;
  final_score: number;
  iterations: AgentIteration[];
  improvement: number;
  credits_used?: number;
}

export type ToolType =
  | 'paraphraser'
  | 'humanizer'
  | 'detector'
  | 'grammar'
  | 'summarizer'
  | 'translator'
  | 'plagiarism'
  | 'seo'
  | 'transform'
  | 'agent_studio';

export interface Tool {
  id: ToolType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface HistoryItem {
  id: string;
  tool_name: string;
  title: string | null;
  status: string;
  credits_used?: number;
  created_at: string;
  project_id: string | null;
}

export interface HistoryDetail extends HistoryItem {
  input_data?: { text?: string } | null;
  output_data?: { summary?: string } | null;
  error_message?: string | null;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  attachment_name?: string | null;
  suggested_engine?: string | null;
  suggested_engine_url?: string | null;
  created_at: string;
}

export interface AssistantSession {
  id: string;
  title: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssistantSessionDetail extends AssistantSession {
  messages: AssistantMessage[];
}

export interface AssistantSendMessageResponse {
  session_id: string;
  title: string | null;
  user_message: AssistantMessage;
  assistant_message: AssistantMessage;
}
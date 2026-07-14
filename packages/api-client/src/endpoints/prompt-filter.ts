import { apiClient } from "../client/client";

export type PromptFilterMode = "monitor" | "warn" | "block";
export type PromptFilterAction = "allow" | "warn" | "block";

export interface PromptFilterPatternConfig {
  name: string;
  pattern: string;
  weight: number;
  category?: string;
  strict?: boolean;
  enabled?: boolean;
}

export interface PromptFilterReviewConfig {
  enabled: boolean;
  api_key?: string;
  base_url: string;
  model: string;
  audit_prompt: string;
  confidence_threshold: number;
  providers?: PromptFilterReviewProviderConfig[];
  timeout_seconds: number;
  fail_closed: boolean;
}

export interface PromptFilterReviewProviderConfig {
  id?: string;
  name: string;
  api_key?: string;
  base_url: string;
  model: string;
  priority: number;
  api_key_configured?: boolean;
  api_key_count?: number;
}

export interface PromptFilterConfig {
  enabled: boolean;
  mode: PromptFilterMode;
  threshold: number;
  strict_threshold: number;
  log_matches: boolean;
  max_text_length: number;
  sensitive_words: string;
  custom_patterns: PromptFilterPatternConfig[];
  disabled_patterns: string[];
  review: PromptFilterReviewConfig;
}

export interface PromptFilterConfigResponse {
  "prompt-filter": PromptFilterConfig;
  defaults: PromptFilterConfig;
  review_api_key_configured: boolean;
  review_api_key_count: number;
}

export interface PromptFilterMatch {
  name: string;
  weight: number;
  category?: string;
  strict?: boolean;
}

export interface PromptFilterVerdict {
  enabled: boolean;
  mode: string;
  action: PromptFilterAction;
  score: number;
  raw_score: number;
  threshold: number;
  strict_hit: boolean;
  matched: PromptFilterMatch[];
  reason?: string;
  text_preview?: string;
  full_text?: string;
  extracted_chars: number;
  reviewed?: boolean;
  review_flagged?: boolean;
  review_error?: string;
  review_model?: string;
  review_provider?: string;
  review_latency_ms?: number;
}

export interface PromptFilterReviewTestResult {
  flagged: boolean;
  confidence: number;
  reason?: string;
  model: string;
  provider: string;
  latency_ms: number;
  output?: string;
}

export interface PromptFilterReviewTestResponse {
  result: PromptFilterReviewTestResult;
  error?: string;
}

export interface PromptFilterLog {
  id: number;
  request_log_id: number;
  created_at: string;
  source: string;
  endpoint: string;
  model: string;
  action: string;
  mode: string;
  score: number;
  threshold: number;
  matched_patterns: string;
  text_preview: string;
  full_text: string;
  api_key: string;
  client_ip: string;
  error_code: string;
  review_model: string;
  review_provider: string;
  review_latency_ms: number;
  reviewed?: boolean;
  review_flagged: boolean;
  review_confidence: number;
  review_error: string;
  review_output?: string;
  review_raw_response?: string;
  review_attempts?: PromptFilterReviewAttempt[];
  reason: string;
}

export interface PromptFilterReviewAttempt {
  provider: string;
  model: string;
  status_code?: number;
  latency_ms: number;
  success: boolean;
  error?: string;
  output?: string;
  raw_response?: string;
}

export interface PromptFilterLogsResponse {
  items: PromptFilterLog[];
  total: number;
  page: number;
  size: number;
}

export interface PromptFilterRule {
  name: string;
  pattern: string;
  weight: number;
  category?: string;
  strict?: boolean;
  enabled: boolean;
  builtin: boolean;
}

export interface PromptFilterRulesResponse {
  builtin_patterns: PromptFilterRule[];
  custom_patterns: PromptFilterPatternConfig[];
  disabled_patterns: string[];
}

export interface PromptFilterLogQuery {
  page?: number;
  size?: number;
  source?: string;
  action?: string;
  endpoint?: string;
  model?: string;
  q?: string;
  score_min?: number;
  score_max?: number;
  reviewed?: boolean;
  intercepted?: boolean;
}

export const promptFilterApi = {
  getConfig: () => apiClient.get<PromptFilterConfigResponse>("/prompt-filter"),

  updateConfig: (config: PromptFilterConfig) =>
    apiClient.put<{ status: string }>("/prompt-filter", config),

  getRules: () => apiClient.get<PromptFilterRulesResponse>("/prompt-filter/rules"),

  testText: (text: string) =>
    apiClient.post<{ verdict: PromptFilterVerdict }>("/prompt-filter/test", { text }),

  testReview: (text: string, review: PromptFilterReviewConfig) =>
    apiClient.post<PromptFilterReviewTestResponse>("/prompt-filter/review/test", {
      text,
      review,
    }),

  testRule: (pattern: string, text: string) =>
    apiClient.post<{ matched: boolean; error?: string }>("/prompt-filter/rules/test", {
      pattern,
      text,
    }),

  listLogs: (query: PromptFilterLogQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.size) params.set("size", String(query.size));
    if (query.source) params.set("source", query.source);
    if (query.action) params.set("action", query.action);
    if (query.endpoint) params.set("endpoint", query.endpoint);
    if (query.model) params.set("model", query.model);
    if (query.q) params.set("q", query.q);
    if (typeof query.score_min === "number" && Number.isFinite(query.score_min)) {
      params.set("score_min", String(Math.trunc(query.score_min)));
    }
    if (typeof query.score_max === "number" && Number.isFinite(query.score_max)) {
      params.set("score_max", String(Math.trunc(query.score_max)));
    }
    if (typeof query.reviewed === "boolean") params.set("reviewed", String(query.reviewed));
    if (typeof query.intercepted === "boolean")
      params.set("intercepted", String(query.intercepted));
    const qs = params.toString();
    return apiClient.get<PromptFilterLogsResponse>(`/prompt-filter/logs${qs ? `?${qs}` : ""}`);
  },

  clearLogs: () => apiClient.delete<{ status: string }>("/prompt-filter/logs"),
};

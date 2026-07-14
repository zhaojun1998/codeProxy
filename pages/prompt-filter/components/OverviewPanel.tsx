import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FlaskConical, Plus, Save, Trash2 } from "lucide-react";
import {
  promptFilterApi,
  type PromptFilterConfig,
  type PromptFilterMode,
  type PromptFilterReviewConfig,
  type PromptFilterReviewProviderConfig,
  type PromptFilterReviewTestResponse,
  type PromptFilterVerdict,
} from "@code-proxy/api-client";
import { Button, Card, Select, TextInput, ToggleSwitch, useToast } from "@code-proxy/ui";
import {
  ActionBadge,
  PROMPT_FILTER_TEXTAREA_CLASS,
  renderPromptFilterHighlight,
} from "../promptFilterShared";

interface OverviewPanelProps {
  config: PromptFilterConfig;
  onSaved: () => void;
}

interface ReviewProviderForm {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  priority: string;
  apiKeyConfigured: boolean;
  apiKeyCount: number;
}

interface OverviewForm {
  enabled: boolean;
  mode: string;
  threshold: string;
  strictThreshold: string;
  logMatches: boolean;
  maxTextLength: string;
  sensitiveWords: string;
  reviewEnabled: boolean;
  reviewProviders: ReviewProviderForm[];
  reviewTimeout: string;
  reviewAuditPrompt: string;
  reviewConfidenceThreshold: string;
}

const createProviderId = () =>
  `provider-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toProviderForm = (
  provider: PromptFilterReviewProviderConfig,
  index: number,
): ReviewProviderForm => ({
  id: provider.id || `provider-${index + 1}`,
  name: provider.name || `Provider ${index + 1}`,
  apiKey: "",
  baseUrl: provider.base_url || "https://api.openai.com",
  model: provider.model || "deepseek-v4-flash",
  priority: String(provider.priority ?? index),
  apiKeyConfigured: provider.api_key_configured === true,
  apiKeyCount: provider.api_key_count ?? 0,
});

const buildProviderForms = (config: PromptFilterConfig): ReviewProviderForm[] => {
  const providers =
    Array.isArray(config.review.providers) && config.review.providers.length > 0
      ? config.review.providers
      : [
          {
            id: "default",
            name: "OpenAI",
            base_url: config.review.base_url,
            model: config.review.model,
            priority: 0,
          },
        ];
  return providers.map(toProviderForm);
};

// provider.api_key 恒为空（后端不回显），保存时留空表示沿用旧值。
const toForm = (config: PromptFilterConfig): OverviewForm => {
  const providers = buildProviderForms(config);
  return {
    enabled: config.enabled,
    mode: config.mode,
    threshold: String(config.threshold),
    strictThreshold: String(config.strict_threshold),
    logMatches: config.log_matches,
    maxTextLength: String(config.max_text_length),
    sensitiveWords: config.sensitive_words,
    reviewEnabled: config.review.enabled,
    reviewProviders: providers,
    reviewTimeout: String(config.review.timeout_seconds),
    reviewAuditPrompt: config.review.audit_prompt,
    reviewConfidenceThreshold: String(config.review.confidence_threshold),
  };
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-900 dark:text-white">{label}</span>
      {children}
      {hint ? <p className="text-xs text-slate-500 dark:text-white/55">{hint}</p> : null}
    </div>
  );
}

function formatReviewLatency(value?: number): string {
  if (!Number.isFinite(value ?? Number.NaN) || !value || value <= 0) return "";
  return `${Math.round(value)}ms`;
}

export function OverviewPanel({ config, onSaved }: OverviewPanelProps) {
  const { t } = useTranslation();
  const { notify } = useToast();

  const initial = useMemo(() => toForm(config), [config]);
  const [form, setForm] = useState<OverviewForm>(initial);
  const [saving, setSaving] = useState(false);

  const [testText, setTestText] = useState("");
  const [testing, setTesting] = useState(false);
  const [verdict, setVerdict] = useState<PromptFilterVerdict | null>(null);
  const [reviewTestText, setReviewTestText] = useState("");
  const [reviewTesting, setReviewTesting] = useState(false);
  const [reviewTestResponse, setReviewTestResponse] =
    useState<PromptFilterReviewTestResponse | null>(null);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const update = useCallback(<K extends keyof OverviewForm>(key: K, value: OverviewForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const modeOptions = useMemo(
    () => [
      { value: "monitor", label: t("prompt_filter.mode_monitor") },
      { value: "warn", label: t("prompt_filter.mode_warn") },
      { value: "block", label: t("prompt_filter.mode_block") },
    ],
    [t],
  );

  const updateProvider = useCallback(
    <K extends keyof ReviewProviderForm>(index: number, key: K, value: ReviewProviderForm[K]) => {
      setForm((prev) => ({
        ...prev,
        reviewProviders: prev.reviewProviders.map((provider, i) =>
          i === index ? { ...provider, [key]: value } : provider,
        ),
      }));
    },
    [],
  );

  const addProvider = useCallback(() => {
    setForm((prev) => {
      const nextPriority =
        prev.reviewProviders.reduce((max, provider) => {
          const value = Number(provider.priority);
          return Number.isFinite(value) ? Math.max(max, value) : max;
        }, -1) + 1;
      return {
        ...prev,
        reviewProviders: [
          ...prev.reviewProviders,
          {
            id: createProviderId(),
            name: t("prompt_filter.review_provider_default_name", {
              count: prev.reviewProviders.length + 1,
            }),
            apiKey: "",
            baseUrl: "https://api.openai.com",
            model: "deepseek-v4-flash",
            priority: String(nextPriority),
            apiKeyConfigured: false,
            apiKeyCount: 0,
          },
        ],
      };
    });
  }, [t]);

  const removeProvider = useCallback((index: number) => {
    setForm((prev) => {
      if (prev.reviewProviders.length <= 1) return prev;
      return {
        ...prev,
        reviewProviders: prev.reviewProviders.filter((_, i) => i !== index),
      };
    });
  }, []);

  const buildReviewConfig = useCallback((): PromptFilterReviewConfig | null => {
    const reviewTimeout = Number(form.reviewTimeout.trim());
    const reviewConfidenceThreshold = Number(form.reviewConfidenceThreshold.trim());
    const reviewProviders = form.reviewProviders.map((provider) => ({
      ...provider,
      priorityNumber: Number(provider.priority.trim()),
    }));
    if (
      !Number.isFinite(reviewTimeout) ||
      !Number.isFinite(reviewConfidenceThreshold) ||
      reviewConfidenceThreshold <= 0 ||
      reviewConfidenceThreshold > 1 ||
      reviewProviders.some((provider) => !Number.isFinite(provider.priorityNumber))
    ) {
      notify({ type: "error", message: t("prompt_filter.number_invalid") });
      return null;
    }
    if (reviewProviders.length === 0) {
      notify({ type: "error", message: t("prompt_filter.review_provider_required") });
      return null;
    }
    const providers = reviewProviders.map((provider) => ({
      id: provider.id,
      name: provider.name.trim(),
      api_key: provider.apiKey,
      base_url: provider.baseUrl.trim(),
      model: provider.model.trim(),
      priority: provider.priorityNumber,
    }));
    const primaryProvider = providers[0];
    return {
      ...config.review,
      enabled: form.reviewEnabled,
      api_key: primaryProvider?.api_key ?? "",
      base_url: primaryProvider?.base_url ?? config.review.base_url,
      model: primaryProvider?.model ?? config.review.model,
      audit_prompt: form.reviewAuditPrompt,
      confidence_threshold: reviewConfidenceThreshold,
      providers,
      timeout_seconds: reviewTimeout,
      fail_closed: false,
    };
  }, [config.review, form, notify, t]);

  const handleSave = useCallback(async () => {
    const threshold = Number(form.threshold.trim());
    const strictThreshold = Number(form.strictThreshold.trim());
    const maxTextLength = Number(form.maxTextLength.trim());
    if (
      !Number.isFinite(threshold) ||
      !Number.isFinite(strictThreshold) ||
      !Number.isFinite(maxTextLength)
    ) {
      notify({ type: "error", message: t("prompt_filter.number_invalid") });
      return;
    }
    const review = buildReviewConfig();
    if (!review) return;

    setSaving(true);
    try {
      const next: PromptFilterConfig = {
        ...config,
        enabled: form.enabled,
        mode: form.mode as PromptFilterMode,
        threshold,
        strict_threshold: strictThreshold,
        log_matches: form.logMatches,
        max_text_length: maxTextLength,
        sensitive_words: form.sensitiveWords,
        review,
      };
      await promptFilterApi.updateConfig(next);
      notify({ type: "success", message: t("prompt_filter.save_success") });
      onSaved();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("prompt_filter.save_failed"),
      });
    } finally {
      setSaving(false);
    }
  }, [buildReviewConfig, config, form, notify, onSaved, t]);

  const handleReviewTest = useCallback(async () => {
    const text = reviewTestText.trim();
    if (!text) {
      notify({ type: "error", message: t("prompt_filter.test_text_required") });
      return;
    }
    const review = buildReviewConfig();
    if (!review) return;
    setReviewTesting(true);
    setReviewTestResponse(null);
    try {
      const response = await promptFilterApi.testReview(text, {
        ...review,
        enabled: true,
      });
      setReviewTestResponse(response);
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("prompt_filter.review_test_failed"),
      });
    } finally {
      setReviewTesting(false);
    }
  }, [buildReviewConfig, notify, reviewTestText, t]);

  const handleTest = useCallback(async () => {
    const text = testText.trim();
    if (!text) {
      notify({ type: "error", message: t("prompt_filter.test_text_required") });
      return;
    }
    setTesting(true);
    try {
      const res = await promptFilterApi.testText(text);
      setVerdict(res.verdict);
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("prompt_filter.test_failed"),
      });
    } finally {
      setTesting(false);
    }
  }, [notify, t, testText]);

  return (
    <div className="space-y-6">
      <Card
        title={t("prompt_filter.config_title")}
        description={t("prompt_filter.config_desc")}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
          >
            <Save size={14} />
            {t("prompt_filter.save")}
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
            <ToggleSwitch
              label={t("prompt_filter.enabled")}
              description={t("prompt_filter.enabled_desc")}
              checked={form.enabled}
              onCheckedChange={(next) => update("enabled", next)}
            />
            <Field label={t("prompt_filter.mode")} hint={t("prompt_filter.mode_hint")}>
              <Select
                aria-label={t("prompt_filter.mode")}
                value={form.mode}
                onChange={(value) => update("mode", value)}
                options={modeOptions}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("prompt_filter.threshold")} hint={t("prompt_filter.threshold_hint")}>
                <TextInput
                  value={form.threshold}
                  onChange={(e) => update("threshold", e.currentTarget.value)}
                  inputMode="decimal"
                  aria-label={t("prompt_filter.threshold")}
                />
              </Field>
              <Field
                label={t("prompt_filter.strict_threshold")}
                hint={t("prompt_filter.strict_threshold_hint")}
              >
                <TextInput
                  value={form.strictThreshold}
                  onChange={(e) => update("strictThreshold", e.currentTarget.value)}
                  inputMode="decimal"
                  aria-label={t("prompt_filter.strict_threshold")}
                />
              </Field>
            </div>
            <Field
              label={t("prompt_filter.max_text_length")}
              hint={t("prompt_filter.max_text_length_hint")}
            >
              <TextInput
                value={form.maxTextLength}
                onChange={(e) => update("maxTextLength", e.currentTarget.value)}
                inputMode="numeric"
                aria-label={t("prompt_filter.max_text_length")}
              />
            </Field>
            <ToggleSwitch
              label={t("prompt_filter.log_matches")}
              description={t("prompt_filter.log_matches_desc")}
              checked={form.logMatches}
              onCheckedChange={(next) => update("logMatches", next)}
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
            <Field
              label={t("prompt_filter.sensitive_words")}
              hint={t("prompt_filter.sensitive_words_hint")}
            >
              <textarea
                value={form.sensitiveWords}
                onChange={(e) => update("sensitiveWords", e.currentTarget.value)}
                placeholder={t("prompt_filter.sensitive_words_placeholder")}
                aria-label={t("prompt_filter.sensitive_words")}
                className={`${PROMPT_FILTER_TEXTAREA_CLASS} min-h-[160px] font-mono text-xs`}
              />
            </Field>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 lg:col-span-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("prompt_filter.review_title")}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/65">
                {t("prompt_filter.review_desc")}
              </p>
            </div>
            <ToggleSwitch
              label={t("prompt_filter.review_enabled")}
              description={t("prompt_filter.review_enabled_desc")}
              checked={form.reviewEnabled}
              onCheckedChange={(next) => update("reviewEnabled", next)}
            />
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t("prompt_filter.review_providers")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                    {t("prompt_filter.review_providers_desc")}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={addProvider}>
                  <Plus size={14} />
                  {t("prompt_filter.review_provider_add")}
                </Button>
              </div>
              <div className="space-y-3">
                {form.reviewProviders.map((provider, index) => {
                  const keyPlaceholder = provider.apiKeyConfigured
                    ? t("prompt_filter.review_api_key_configured", {
                        count: provider.apiKeyCount,
                      })
                    : t("prompt_filter.review_api_key_placeholder");
                  return (
                    <div
                      key={provider.id}
                      className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/45">
                          {provider.name ||
                            t("prompt_filter.review_provider_default_name", { count: index + 1 })}
                        </span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => removeProvider(index)}
                          disabled={form.reviewProviders.length <= 1}
                          aria-label={t("prompt_filter.review_provider_remove")}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <Field label={t("prompt_filter.review_provider_name")}>
                          <TextInput
                            value={provider.name}
                            onChange={(e) => updateProvider(index, "name", e.currentTarget.value)}
                            placeholder={t("prompt_filter.review_provider_name_placeholder")}
                            aria-label={t("prompt_filter.review_provider_name")}
                          />
                        </Field>
                        <Field label={t("prompt_filter.review_provider_priority")}>
                          <TextInput
                            value={provider.priority}
                            onChange={(e) =>
                              updateProvider(index, "priority", e.currentTarget.value)
                            }
                            inputMode="numeric"
                            aria-label={t("prompt_filter.review_provider_priority")}
                          />
                        </Field>
                        <Field label={t("prompt_filter.review_base_url")}>
                          <TextInput
                            value={provider.baseUrl}
                            onChange={(e) =>
                              updateProvider(index, "baseUrl", e.currentTarget.value)
                            }
                            placeholder="https://api.openai.com/v1"
                            aria-label={t("prompt_filter.review_base_url")}
                          />
                        </Field>
                        <Field label={t("prompt_filter.review_model")}>
                          <TextInput
                            value={provider.model}
                            onChange={(e) => updateProvider(index, "model", e.currentTarget.value)}
                            placeholder="deepseek-v4-flash"
                            aria-label={t("prompt_filter.review_model")}
                          />
                        </Field>
                        <Field label={t("prompt_filter.review_api_type")}>
                          <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white/75">
                            {t("prompt_filter.review_api_type_chat")}
                          </div>
                        </Field>
                      </div>
                      <Field
                        label={t("prompt_filter.review_api_key")}
                        hint={t("prompt_filter.review_api_key_hint")}
                      >
                        <TextInput
                          value={provider.apiKey}
                          onChange={(e) => updateProvider(index, "apiKey", e.currentTarget.value)}
                          type="password"
                          autoComplete="new-password"
                          placeholder={keyPlaceholder}
                          aria-label={t("prompt_filter.review_api_key")}
                        />
                      </Field>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={t("prompt_filter.review_timeout")}
                hint={t("prompt_filter.review_timeout_hint")}
              >
                <TextInput
                  value={form.reviewTimeout}
                  onChange={(e) => update("reviewTimeout", e.currentTarget.value)}
                  inputMode="numeric"
                  aria-label={t("prompt_filter.review_timeout")}
                />
              </Field>
              <Field label={t("prompt_filter.review_confidence_threshold")}>
                <TextInput
                  value={form.reviewConfidenceThreshold}
                  onChange={(e) => update("reviewConfidenceThreshold", e.currentTarget.value)}
                  inputMode="decimal"
                  aria-label={t("prompt_filter.review_confidence_threshold")}
                />
              </Field>
            </div>
            <Field
              label={t("prompt_filter.review_audit_prompt")}
              hint={t("prompt_filter.review_audit_prompt_hint")}
            >
              <textarea
                value={form.reviewAuditPrompt}
                onChange={(e) => update("reviewAuditPrompt", e.currentTarget.value)}
                className={`${PROMPT_FILTER_TEXTAREA_CLASS} min-h-[260px] font-mono text-xs`}
                aria-label={t("prompt_filter.review_audit_prompt")}
              />
            </Field>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("prompt_filter.review_test_title")}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                  {t("prompt_filter.review_test_desc")}
                </p>
              </div>
              <textarea
                value={reviewTestText}
                onChange={(event) => setReviewTestText(event.currentTarget.value)}
                placeholder={t("prompt_filter.review_test_placeholder")}
                aria-label={t("prompt_filter.review_test_title")}
                className={`${PROMPT_FILTER_TEXTAREA_CLASS} min-h-[120px]`}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleReviewTest()}
                  disabled={reviewTesting || !reviewTestText.trim()}
                >
                  <FlaskConical size={14} />
                  {t("prompt_filter.review_test_run")}
                </Button>
              </div>
              {reviewTestResponse ? <ReviewTestResultView response={reviewTestResponse} /> : null}
            </div>
          </div>
        </div>
      </Card>

      <Card title={t("prompt_filter.test_title")} description={t("prompt_filter.test_desc")}>
        <div className="space-y-3">
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.currentTarget.value)}
            placeholder={t("prompt_filter.test_placeholder")}
            aria-label={t("prompt_filter.test_title")}
            className={`${PROMPT_FILTER_TEXTAREA_CLASS} min-h-[120px]`}
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleTest()}
              disabled={testing || !testText.trim()}
            >
              <FlaskConical size={14} />
              {t("prompt_filter.test_run")}
            </Button>
          </div>
          {verdict ? <VerdictView verdict={verdict} /> : null}
        </div>
      </Card>
    </div>
  );
}

function ReviewTestResultView({ response }: { response: PromptFilterReviewTestResponse }) {
  const { t } = useTranslation();
  const { result, error } = response;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/70">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-white/55">
        <span
          className={`rounded-full border px-2 py-0.5 font-medium ${
            error
              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
              : result.flagged
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
          }`}
        >
          {error
            ? t("prompt_filter.verdict_review_skipped")
            : result.flagged
              ? t("prompt_filter.verdict_review_flagged")
              : t("prompt_filter.verdict_review_passed")}
        </span>
        {result.provider ? <span>{result.provider}</span> : null}
        {result.model ? <span>{result.model}</span> : null}
        <span>
          {t("prompt_filter.review_confidence")}: {result.confidence.toFixed(3)}
        </span>
        {formatReviewLatency(result.latency_ms) ? (
          <span>
            {t("prompt_filter.verdict_review_latency")}: {formatReviewLatency(result.latency_ms)}
          </span>
        ) : null}
      </div>
      {result.reason ? (
        <p className="text-sm text-slate-700 dark:text-white/75">
          {t("prompt_filter.verdict_reason")}: {result.reason}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
          {t("prompt_filter.review_test_output")}
        </p>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white/80">
          {result.output || t("prompt_filter.review_test_no_output")}
        </pre>
      </div>
    </div>
  );
}

function VerdictView({ verdict }: { verdict: PromptFilterVerdict }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <ActionBadge action={verdict.action} />
        <span className="text-slate-600 dark:text-white/70">
          {t("prompt_filter.verdict_score")}:{" "}
          <span className="font-mono tabular-nums text-slate-900 dark:text-white">
            {verdict.score}
          </span>{" "}
          / {t("prompt_filter.verdict_threshold")}:{" "}
          <span className="font-mono tabular-nums text-slate-900 dark:text-white">
            {verdict.threshold}
          </span>
        </span>
        {verdict.strict_hit ? (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
            {t("prompt_filter.verdict_strict_hit")}
          </span>
        ) : null}
        <span className="text-xs text-slate-500 dark:text-white/50">
          {t("prompt_filter.verdict_extracted_chars", { count: verdict.extracted_chars })}
        </span>
      </div>

      {verdict.reason ? (
        <p className="text-sm text-slate-700 dark:text-white/75">
          {t("prompt_filter.verdict_reason")}: {verdict.reason}
        </p>
      ) : null}

      {verdict.matched.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
            {t("prompt_filter.verdict_matched")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {verdict.matched.map((match, idx) => (
              <span
                key={`${match.name}-${idx}`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-white/80"
              >
                {match.name}
                {match.category ? (
                  <span className="text-slate-400 dark:text-white/40">· {match.category}</span>
                ) : null}
                <span className="text-slate-400 dark:text-white/40">· {match.weight}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {verdict.text_preview ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
            {t("prompt_filter.verdict_preview")}
          </p>
          <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/75">
            {renderPromptFilterHighlight(verdict.text_preview)}
          </p>
        </div>
      ) : null}

      {verdict.reviewed ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-white/55">
          <span className="font-semibold">{t("prompt_filter.verdict_review")}:</span>
          {verdict.review_provider ? (
            <span>
              {t("prompt_filter.verdict_review_provider")}: {verdict.review_provider}
            </span>
          ) : null}
          {verdict.review_model ? <span>{verdict.review_model}</span> : null}
          {formatReviewLatency(verdict.review_latency_ms) ? (
            <span>
              {t("prompt_filter.verdict_review_latency")}:{" "}
              {formatReviewLatency(verdict.review_latency_ms)}
            </span>
          ) : null}
          {verdict.review_error ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
              {t("prompt_filter.verdict_review_skipped")}
            </span>
          ) : verdict.review_flagged ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
              {t("prompt_filter.verdict_review_flagged")}
            </span>
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
              {t("prompt_filter.verdict_review_passed")}
            </span>
          )}
          {verdict.review_error ? (
            <span className="text-rose-600 dark:text-rose-300">{verdict.review_error}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

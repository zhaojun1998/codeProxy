import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import type { PromptFilterLog } from "@code-proxy/api-client";
import { Button, Modal } from "@code-proxy/ui";
import {
  ActionBadge,
  ModeBadge,
  formatPromptFilterTime,
  parseMatchedPatterns,
  renderPromptFilterHighlight,
} from "./promptFilterShared";

function formatReviewLatency(value?: number): string {
  if (!Number.isFinite(value ?? Number.NaN) || !value || value <= 0) return "-";
  return `${Math.round(value)}ms`;
}

export function PromptFilterLogDetailModal({
  log,
  onClose,
  onOpenRequestLog,
}: {
  log: PromptFilterLog | null;
  onClose: () => void;
  onOpenRequestLog?: (requestLogID: number) => void;
}) {
  const { t } = useTranslation();
  const matched = log ? parseMatchedPatterns(log.matched_patterns) : [];
  const reviewAttempts = log?.review_attempts ?? [];

  return (
    <Modal
      open={log !== null}
      title={t("prompt_filter.log_detail_title")}
      maxWidth="max-w-2xl"
      onClose={onClose}
    >
      {log ? (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBadge action={log.action} />
            <ModeBadge mode={log.mode} />
            <span className="text-slate-600 dark:text-white/70">
              {t("prompt_filter.verdict_score")}: {" "}
              <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                {log.score}
              </span>{" "}
              / {log.threshold}
            </span>
            {onOpenRequestLog && log.request_log_id > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                className="ml-auto"
                onClick={() => onOpenRequestLog(log.request_log_id)}
              >
                <ExternalLink size={14} aria-hidden="true" />
                {t("prompt_filter.open_request_log")}
              </Button>
            ) : null}
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <DetailRow
              label={t("prompt_filter.col_time")}
              value={formatPromptFilterTime(log.created_at)}
            />
            <DetailRow label={t("prompt_filter.col_source")} value={log.source || "-"} />
            <DetailRow label={t("prompt_filter.col_endpoint")} value={log.endpoint || "-"} />
            <DetailRow label={t("prompt_filter.col_model")} value={log.model || "-"} mono />
            <DetailRow label={t("prompt_filter.col_api_key")} value={log.api_key || "-"} mono />
            <DetailRow label={t("prompt_filter.col_client_ip")} value={log.client_ip || "-"} mono />
            <DetailRow
              label={t("prompt_filter.filter_reviewed")}
              value={
                log.reviewed
                  ? t("prompt_filter.filter_reviewed_yes")
                  : t("prompt_filter.filter_reviewed_no")
              }
            />
            {log.error_code ? (
              <DetailRow label={t("prompt_filter.col_error_code")} value={log.error_code} mono />
            ) : null}
            {log.review_model ? (
              <DetailRow label={t("prompt_filter.verdict_review")} value={log.review_model} />
            ) : null}
            {log.review_provider ? (
              <DetailRow
                label={t("prompt_filter.col_review_provider")}
                value={log.review_provider}
              />
            ) : null}
            {log.review_latency_ms > 0 ? (
              <DetailRow
                label={t("prompt_filter.col_review_latency")}
                value={formatReviewLatency(log.review_latency_ms)}
                mono
              />
            ) : null}
            {log.review_confidence > 0 ? (
              <DetailRow
                label={t("prompt_filter.review_confidence")}
                value={`${Math.round(log.review_confidence * 100)}%`}
                mono
              />
            ) : null}
          </dl>

          {reviewAttempts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
                {t("prompt_filter.review_attempts")}
              </p>
              {reviewAttempts.map((attempt, index) => (
                <div
                  key={`${attempt.provider}-${index}`}
                  className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-white/85">
                      {index + 1}. {attempt.provider || "-"}
                    </span>
                    <span className="font-mono text-slate-500 dark:text-white/50">
                      {attempt.model || "-"}
                    </span>
                    {attempt.status_code ? (
                      <span className="font-mono text-slate-500 dark:text-white/50">
                        HTTP {attempt.status_code}
                      </span>
                    ) : null}
                    <span className="font-mono text-slate-500 dark:text-white/50">
                      {formatReviewLatency(attempt.latency_ms)}
                    </span>
                    <span
                      className={
                        attempt.success
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {attempt.success
                        ? t("prompt_filter.review_attempt_success")
                        : t("prompt_filter.review_attempt_failed")}
                    </span>
                  </div>
                  {attempt.error ? (
                    <p className="break-words text-xs text-rose-700 dark:text-rose-300">
                      {attempt.error}
                    </p>
                  ) : null}
                  {attempt.output ? (
                    <ReviewCodeBlock
                      label={t("prompt_filter.review_model_output")}
                      value={attempt.output}
                    />
                  ) : null}
                  {attempt.raw_response ? (
                    <ReviewCodeBlock
                      label={t("prompt_filter.review_raw_response")}
                      value={attempt.raw_response}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : log.review_raw_response ? (
            <ReviewCodeBlock
              label={t("prompt_filter.review_raw_response")}
              value={log.review_raw_response}
            />
          ) : log.review_output ? (
            <ReviewCodeBlock
              label={t("prompt_filter.review_model_output")}
              value={log.review_output}
            />
          ) : null}

          {matched.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
                {t("prompt_filter.verdict_matched")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matched.map((match, index) => (
                  <span
                    key={`${match.name}-${index}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-white/80"
                  >
                    {match.name}
                    <span className="text-slate-400 dark:text-white/40">· {match.weight}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {log.review_error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
              {log.review_error}
            </p>
          ) : null}

          {log.reason ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
              {t("prompt_filter.audit_reason")}: {log.reason}
            </p>
          ) : null}

          {log.text_preview ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
                {t("prompt_filter.verdict_preview")}
              </p>
              <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-3 leading-relaxed text-slate-700 dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-white/75">
                {renderPromptFilterHighlight(log.text_preview)}
              </p>
            </div>
          ) : null}

          {log.full_text ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-white/55">
                {t("prompt_filter.full_text")}
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-white/75">
                {log.full_text}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function ReviewCodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-slate-500 dark:text-white/50">{label}</p>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-relaxed text-slate-700 dark:border-neutral-700 dark:bg-neutral-950/70 dark:text-white/75">
        {value}
      </pre>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400 dark:text-white/40">{label}</dt>
      <dd
        className={`truncate text-slate-700 dark:text-white/75 ${mono ? "font-mono text-xs" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ExternalLink, Eye, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import {
  promptFilterApi,
  type PromptFilterLog,
  type PromptFilterLogQuery,
} from "@code-proxy/api-client";
import {
  Button,
  ConfirmModal,
  DataTable,
  DataTableColumnVisibilityMenu,
  Modal,
  PaginationBar,
  Select,
  TextInput,
  useToast,
  type DataTableColumn,
  useDataTableColumnVisibility,
} from "@code-proxy/ui";
import {
  ActionBadge,
  ModeBadge,
  formatPromptFilterTime,
  parseMatchedPatterns,
  renderPromptFilterHighlight,
} from "../promptFilterShared";

const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface LogFilters {
  action: string;
  source: string;
  endpoint: string;
  model: string;
  q: string;
  scoreMin: number | null;
  scoreMax: number | null;
  reviewed: string;
  intercepted: string;
}

const EMPTY_FILTERS: LogFilters = {
  action: "",
  source: "",
  endpoint: "",
  model: "",
  q: "",
  scoreMin: null,
  scoreMax: null,
  reviewed: "",
  intercepted: "",
};

function formatReviewLatency(value?: number): string {
  if (!Number.isFinite(value ?? Number.NaN) || !value || value <= 0) return "-";
  return `${Math.round(value)}ms`;
}

export function LogsPanel() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestLogID = Number(searchParams.get("request_log_id"));

  const [items, setItems] = useState<PromptFilterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const [actionFilter, setActionFilter] = useState("");
  const [source, setSource] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [model, setModel] = useState("");
  const [q, setQ] = useState("");
  const [scoreMin, setScoreMin] = useState<number | null>(null);
  const [scoreMax, setScoreMax] = useState<number | null>(null);
  const [reviewedFilter, setReviewedFilter] = useState("");
  const [interceptedFilter, setInterceptedFilter] = useState("");

  const [detailLog, setDetailLog] = useState<PromptFilterLog | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchLogs = useCallback(
    async (page: number, size: number, override?: Partial<LogFilters>) => {
      const filters: LogFilters = {
        action: actionFilter,
        source,
        endpoint,
        model,
        q,
        scoreMin,
        scoreMax,
        reviewed: reviewedFilter,
        intercepted: interceptedFilter,
        ...override,
      };
      const query: PromptFilterLogQuery = {
        page,
        size,
        request_log_id:
          Number.isSafeInteger(requestLogID) && requestLogID > 0 ? requestLogID : undefined,
        action: filters.action || undefined,
        source: filters.source.trim() || undefined,
        endpoint: filters.endpoint.trim() || undefined,
        model: filters.model.trim() || undefined,
        q: filters.q.trim() || undefined,
        score_min: filters.scoreMin ?? undefined,
        score_max: filters.scoreMax ?? undefined,
        reviewed: filters.reviewed === "" ? undefined : filters.reviewed === "true",
        intercepted: filters.intercepted === "" ? undefined : filters.intercepted === "true",
      };
      setLoading(true);
      try {
        const res = await promptFilterApi.listLogs(query);
        setItems(res.items ?? []);
        if (query.request_log_id && res.items?.[0]) setDetailLog(res.items[0]);
        setTotalCount(res.total ?? 0);
        setCurrentPage(res.page ?? page);
      } catch (err: unknown) {
        notify({
          type: "error",
          message: err instanceof Error ? err.message : t("prompt_filter.logs_load_failed"),
        });
      } finally {
        setLoading(false);
      }
    },
    [
      actionFilter,
      source,
      endpoint,
      model,
      q,
      scoreMin,
      scoreMax,
      reviewedFilter,
      interceptedFilter,
      requestLogID,
      notify,
      t,
    ],
  );

  // 挂载后拉取首页；后续查询由筛选/分页操作显式触发，避免筛选输入即请求。
  useEffect(() => {
    void fetchLogs(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleActionChange = useCallback(
    (value: string) => {
      setActionFilter(value);
      void fetchLogs(1, pageSize, { action: value });
    },
    [fetchLogs, pageSize],
  );

  const handleSearch = useCallback(() => {
    void fetchLogs(1, pageSize);
  }, [fetchLogs, pageSize]);

  const handleReset = useCallback(() => {
    setActionFilter("");
    setSource("");
    setEndpoint("");
    setModel("");
    setQ("");
    setScoreMin(null);
    setScoreMax(null);
    setReviewedFilter("");
    setInterceptedFilter("");
    void fetchLogs(1, pageSize, EMPTY_FILTERS);
  }, [fetchLogs, pageSize]);

  const handlePageChange = useCallback(
    (page: number) => {
      void fetchLogs(Math.max(1, Math.min(page, totalPages)), pageSize);
    },
    [fetchLogs, pageSize, totalPages],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      void fetchLogs(1, size);
    },
    [fetchLogs],
  );

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      await promptFilterApi.clearLogs();
      notify({ type: "success", message: t("prompt_filter.logs_cleared") });
      setConfirmClearOpen(false);
      await fetchLogs(1, pageSize);
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("prompt_filter.logs_clear_failed"),
      });
    } finally {
      setClearing(false);
    }
  }, [fetchLogs, notify, pageSize, t]);

  const openDetail = useCallback((log: PromptFilterLog) => setDetailLog(log), []);
  const openRequestLog = useCallback(
    (requestLogID: number) => {
      setDetailLog(null);
      navigate(`/runtime/request-logs?log_id=${requestLogID}`);
    },
    [navigate],
  );

  const columns = useMemo<DataTableColumn<PromptFilterLog>[]>(
    () => [
      {
        key: "created_at",
        label: t("prompt_filter.col_time"),
        width: "w-[184px] min-w-[184px]",
        cellClassName: "whitespace-nowrap text-slate-500 dark:text-white/50",
        render: (row) => formatPromptFilterTime(row.created_at),
      },
      {
        key: "action",
        label: t("prompt_filter.col_action"),
        width: "w-[96px] min-w-[96px]",
        render: (row) => <ActionBadge action={row.action} />,
      },
      {
        key: "score",
        label: t("prompt_filter.col_score"),
        width: "w-[88px] min-w-[88px]",
        cellClassName: "font-mono tabular-nums text-slate-700 dark:text-white/70",
        render: (row) => row.score,
      },
      {
        key: "source",
        label: t("prompt_filter.col_source"),
        width: "w-[110px] min-w-[110px]",
        cellClassName: "truncate text-slate-700 dark:text-white/70",
        render: (row) => row.source || "-",
      },
      {
        key: "endpoint",
        label: t("prompt_filter.col_endpoint"),
        width: "w-[150px] min-w-[150px]",
        cellClassName: "truncate text-slate-700 dark:text-white/70",
        render: (row) => (
          <span className="block truncate" title={row.endpoint}>
            {row.endpoint || "-"}
          </span>
        ),
      },
      {
        key: "model",
        label: t("prompt_filter.col_model"),
        width: "w-[160px] min-w-[160px]",
        cellClassName: "truncate text-slate-700 dark:text-white/70",
        render: (row) => (
          <span className="block truncate font-mono text-xs" title={row.model}>
            {row.model || "-"}
          </span>
        ),
      },
      {
        key: "api_key",
        label: t("prompt_filter.col_api_key"),
        width: "w-[150px] min-w-[150px]",
        cellClassName: "truncate",
        render: (row) => (
          <span
            className="block truncate font-mono text-xs text-slate-500 dark:text-white/50"
            title={row.api_key}
          >
            {row.api_key || "-"}
          </span>
        ),
      },
      {
        key: "client_ip",
        label: t("prompt_filter.col_client_ip"),
        width: "w-[130px] min-w-[130px]",
        cellClassName: "truncate font-mono text-xs text-slate-500 dark:text-white/50",
        render: (row) => row.client_ip || "-",
      },
      {
        key: "matched",
        label: t("prompt_filter.col_matched"),
        width: "w-[180px] min-w-[180px]",
        cellClassName: "truncate text-slate-700 dark:text-white/70",
        render: (row) => {
          const names = parseMatchedPatterns(row.matched_patterns).map((m) => m.name);
          if (names.length === 0) {
            return <span className="text-slate-400 dark:text-white/30">-</span>;
          }
          const text = names.join(", ");
          return (
            <span className="block truncate" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        key: "review_provider",
        label: t("prompt_filter.col_review_provider"),
        width: "w-[150px] min-w-[150px]",
        cellClassName: "truncate text-slate-700 dark:text-white/70",
        render: (row) => (
          <span className="block truncate" title={row.review_provider}>
            {row.review_provider || "-"}
          </span>
        ),
      },
      {
        key: "review_latency_ms",
        label: t("prompt_filter.col_review_latency"),
        width: "w-[110px] min-w-[110px]",
        cellClassName: "font-mono text-xs tabular-nums text-slate-500 dark:text-white/50",
        render: (row) => formatReviewLatency(row.review_latency_ms),
      },
      {
        key: "actions",
        label: t("prompt_filter.col_detail"),
        width: "w-[80px] min-w-[80px]",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={() => openDetail(row)}
            aria-label={t("prompt_filter.view_detail")}
            title={t("prompt_filter.view_detail")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-white/50 dark:hover:bg-neutral-800 dark:hover:text-blue-400"
          >
            <Eye size={15} />
          </button>
        ),
      },
    ],
    [openDetail, t],
  );
  const columnVisibility = useDataTableColumnVisibility("prompt-filter-logs", columns);

  return (
    <div className="flex flex-col rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {t("prompt_filter.logs_title")}
        </h2>
        <div className="flex items-center gap-2">
          <DataTableColumnVisibilityMenu
            columns={columns}
            visibleKeys={columnVisibility.visibleKeys}
            onVisibilityChange={columnVisibility.setColumnVisible}
            onReset={columnVisibility.reset}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchLogs(currentPage, pageSize)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {t("common.refresh")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmClearOpen(true)}
            disabled={loading || clearing}
          >
            <Trash2 size={14} />
            {t("prompt_filter.logs_clear")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-neutral-800/60">
        <div className="w-full sm:w-[140px]">
          <Select
            aria-label={t("prompt_filter.col_action")}
            value={actionFilter}
            onChange={handleActionChange}
            options={[
              { value: "", label: t("prompt_filter.filter_all_actions") },
              { value: "allow", label: t("prompt_filter.action_allow") },
              { value: "warn", label: t("prompt_filter.action_warn") },
              { value: "block", label: t("prompt_filter.action_block") },
            ]}
            size="sm"
          />
        </div>
        <div className="w-full sm:w-[150px]">
          <Select
            aria-label={t("prompt_filter.filter_reviewed")}
            value={reviewedFilter}
            onChange={(value) => {
              setReviewedFilter(value);
              void fetchLogs(1, pageSize, { reviewed: value });
            }}
            options={[
              { value: "", label: t("prompt_filter.filter_reviewed_all") },
              { value: "true", label: t("prompt_filter.filter_reviewed_yes") },
              { value: "false", label: t("prompt_filter.filter_reviewed_no") },
            ]}
            size="sm"
          />
        </div>
        <div className="w-full sm:w-[150px]">
          <Select
            aria-label={t("prompt_filter.filter_intercepted")}
            value={interceptedFilter}
            onChange={(value) => {
              setInterceptedFilter(value);
              void fetchLogs(1, pageSize, { intercepted: value });
            }}
            options={[
              { value: "", label: t("prompt_filter.filter_intercepted_all") },
              { value: "true", label: t("prompt_filter.filter_intercepted_yes") },
              { value: "false", label: t("prompt_filter.filter_intercepted_no") },
            ]}
            size="sm"
          />
        </div>
        <FilterInput
          value={source}
          onChange={setSource}
          onEnter={handleSearch}
          placeholder={t("prompt_filter.filter_source")}
        />
        <FilterInput
          value={endpoint}
          onChange={setEndpoint}
          onEnter={handleSearch}
          placeholder={t("prompt_filter.filter_endpoint")}
        />
        <FilterInput
          value={model}
          onChange={setModel}
          onEnter={handleSearch}
          placeholder={t("prompt_filter.filter_model")}
        />
        <FilterInput
          value={q}
          onChange={setQ}
          onEnter={handleSearch}
          placeholder={t("prompt_filter.filter_keyword")}
        />
        <ScoreRangeFilter
          scoreMin={scoreMin}
          scoreMax={scoreMax}
          onChange={(min, max) => {
            setScoreMin(min);
            setScoreMax(max);
          }}
          onEnter={handleSearch}
        />
        <Button variant="secondary" size="sm" onClick={handleSearch} disabled={loading}>
          <Search size={14} />
          {t("prompt_filter.filter_search")}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset} disabled={loading}>
          <RotateCcw size={14} />
          {t("prompt_filter.filter_reset")}
        </Button>
      </div>

      <div className="relative min-h-[320px] h-[calc(100dvh-360px)] overflow-hidden px-5">
        <DataTable
          tableId="prompt-filter-logs"
          rows={items}
          columns={columnVisibility.visibleColumns}
          rowKey={(row) => String(row.id)}
          loading={loading}
          virtualize={false}
          minWidth="min-w-[1420px]"
          height="h-full"
          minHeight="min-h-full"
          caption={t("prompt_filter.logs_title")}
          emptyText={t("prompt_filter.logs_empty")}
          showAllLoadedMessage={false}
        />
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        className="border-t border-slate-100 px-3 py-3 sm:px-5 dark:border-neutral-800/60"
        labels={{
          firstPage: t("prompt_filter.page_first"),
          previousPage: t("prompt_filter.page_prev"),
          nextPage: t("prompt_filter.page_next"),
          lastPage: t("prompt_filter.page_last"),
          rowsPerPage: t("prompt_filter.page_rows"),
          pageInfo: ({ start, end, total }) => t("prompt_filter.page_info", { start, end, total }),
        }}
      />

      <LogDetailModal
        log={detailLog}
        onClose={() => setDetailLog(null)}
        onOpenRequestLog={openRequestLog}
      />

      <ConfirmModal
        open={confirmClearOpen}
        title={t("prompt_filter.logs_clear_title")}
        description={t("prompt_filter.logs_clear_desc")}
        confirmText={t("prompt_filter.logs_clear_confirm")}
        cancelText={t("common.cancel")}
        variant="danger"
        busy={clearing}
        onConfirm={() => void handleClear()}
        onClose={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}

function ScoreRangeFilter({
  scoreMin,
  scoreMax,
  onChange,
  onEnter,
}: {
  scoreMin: number | null;
  scoreMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
  onEnter: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-slate-500 dark:text-white/50">
        {t("prompt_filter.filter_score")}
      </span>
      <div className="w-[72px]">
        <TextInput
          value={scoreMin === null ? "" : String(scoreMin)}
          onChange={(event) => onChange(parseInteger(event.currentTarget.value), scoreMax)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onEnter();
          }}
          placeholder={t("prompt_filter.score_min")}
          aria-label={t("prompt_filter.score_min")}
          inputMode="numeric"
          size="sm"
        />
      </div>
      <span className="text-xs text-slate-400 dark:text-white/40">-</span>
      <div className="w-[72px]">
        <TextInput
          value={scoreMax === null ? "" : String(scoreMax)}
          onChange={(event) => onChange(scoreMin, parseInteger(event.currentTarget.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") onEnter();
          }}
          placeholder={t("prompt_filter.score_max")}
          aria-label={t("prompt_filter.score_max")}
          inputMode="numeric"
          size="sm"
        />
      </div>
    </div>
  );
}

function parseInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

function FilterInput({
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  placeholder: string;
}) {
  return (
    <div className="w-full sm:w-[150px]">
      <TextInput
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={placeholder}
        size="sm"
      />
    </div>
  );
}

function LogDetailModal({
  log,
  onClose,
  onOpenRequestLog,
}: {
  log: PromptFilterLog | null;
  onClose: () => void;
  onOpenRequestLog: (requestLogID: number) => void;
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
              {t("prompt_filter.verdict_score")}:{" "}
              <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                {log.score}
              </span>{" "}
              / {log.threshold}
            </span>
            {log.request_log_id > 0 ? (
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
                {matched.map((m, idx) => (
                  <span
                    key={`${m.name}-${idx}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-white/80"
                  >
                    {m.name}
                    <span className="text-slate-400 dark:text-white/40">· {m.weight}</span>
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

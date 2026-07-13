import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Gift, Loader2, RefreshCw } from "lucide-react";
import {
  apiCallApi,
  getApiCallErrorMessage,
  type ApiCallResult,
  type AuthFileItem,
} from "@code-proxy/api-client";
import { Button, Card, EmptyState, HoverTooltip } from "@code-proxy/ui";
import { resolveAuthFileDisplayName } from "@code-proxy/domain";
import {
  CODEX_REQUEST_HEADERS,
  isRecord,
  normalizeAuthIndexValue,
  normalizeNumberValue,
  normalizeStringValue,
  resolveAuthProvider,
  resolveCodexChatgptAccountId,
} from "@features/quota-preview/quota-helpers";

const CODEX_RESET_CREDITS_URL =
  "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits";

type CodexResetCreditPayload = {
  available_count?: unknown;
  availableCount?: unknown;
  total_earned_count?: unknown;
  totalEarnedCount?: unknown;
  credits?: unknown;
  items?: unknown;
};

type CodexResetCreditRow = {
  id: string;
  accountName: string;
  accountId: string;
  source: string;
  status: string;
  grantedAt: string;
  grantedAtRaw: string;
  expiresAt: string;
  usedAt: string;
};

type CodexResetCreditsAccountResult = {
  fileName: string;
  accountName: string;
  accountId: string;
  availableCount: number | null;
  totalEarnedCount: number | null;
  credits: CodexResetCreditRow[];
  error?: string;
};

type CodexResetCreditsState = {
  loading: boolean;
  loaded: boolean;
  accounts: CodexResetCreditsAccountResult[];
};

type CountSummary = {
  known: boolean;
  value: number;
};

const normalizeText = (value: unknown): string => normalizeStringValue(value) ?? "";

const formatDateTime = (value: unknown): string => {
  const text = normalizeText(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat(undefined, {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\//g, "-");
};

const parseResetCreditsPayload = (payload: unknown): CodexResetCreditPayload | null => {
  if (isRecord(payload)) return payload as CodexResetCreditPayload;
  const text = normalizeText(payload);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? (parsed as CodexResetCreditPayload) : null;
  } catch {
    return null;
  }
};

const extractCreditRecords = (payload: CodexResetCreditPayload): Record<string, unknown>[] => {
  const records = Array.isArray(payload.credits)
    ? payload.credits
    : Array.isArray(payload.items)
      ? payload.items
      : [];
  return records.filter(isRecord);
};

const buildCodexRequestHeaders = (file: AuthFileItem): Record<string, string> => {
  const headers: Record<string, string> = {
    ...CODEX_REQUEST_HEADERS,
    Accept: "application/json",
  };
  const accountId = resolveCodexChatgptAccountId(file);
  if (accountId) {
    headers["Chatgpt-Account-Id"] = accountId;
  }
  return headers;
};

const getCreditUseTime = (
  credit: Record<string, unknown>,
  t: (key: string, values?: Record<string, unknown>) => string,
): string => {
  const redeemedAt = normalizeText(credit.redeemed_at ?? credit.redeemedAt);
  if (redeemedAt) return formatDateTime(redeemedAt);
  const redeemStartedAt = normalizeText(credit.redeem_started_at ?? credit.redeemStartedAt);
  if (redeemStartedAt) {
    return t("auth_files.codex_reset_credits_redeeming", {
      time: formatDateTime(redeemStartedAt),
    });
  }
  return "";
};

const resolveCreditSource = (
  credit: Record<string, unknown>,
  t: (key: string) => string,
): string => {
  const title = normalizeText(credit.title);
  const description = normalizeText(credit.description);
  const profile = normalizeText(credit.profile_user_id ?? credit.profileUserId);
  const resetType = normalizeText(credit.reset_type ?? credit.resetType);
  const searchable = `${title} ${description} ${profile}`.toLowerCase();

  if (/codex team|thanks for using codex|official|官方/u.test(searchable)) {
    return t("auth_files.codex_reset_credits_source_official");
  }
  return (
    description ||
    title ||
    profile ||
    resetType ||
    t("auth_files.codex_reset_credits_source_unknown")
  );
};

const resolveAccountName = (file: AuthFileItem): string =>
  resolveAuthFileDisplayName(file) || normalizeText(file.email) || file.name;

const normalizeCreditRow = (
  credit: Record<string, unknown>,
  index: number,
  account: { accountName: string; accountId: string },
  t: (key: string, values?: Record<string, unknown>) => string,
): CodexResetCreditRow => {
  const rawId = normalizeText(credit.id ?? credit.credit_id ?? credit.creditId);
  const grantedAtRaw = normalizeText(credit.granted_at ?? credit.grantedAt);
  return {
    id: rawId || `${account.accountId || account.accountName}-${index}`,
    accountName: account.accountName,
    accountId: account.accountId,
    source: resolveCreditSource(credit, t),
    status: normalizeText(credit.status) || "--",
    grantedAt: formatDateTime(grantedAtRaw),
    grantedAtRaw,
    expiresAt: formatDateTime(credit.expires_at ?? credit.expiresAt),
    usedAt: getCreditUseTime(credit, t),
  };
};

const fetchCreditsForFile = async (
  file: AuthFileItem,
  t: (key: string, values?: Record<string, unknown>) => string,
): Promise<CodexResetCreditsAccountResult> => {
  const authIndex = normalizeAuthIndexValue(file.auth_index ?? file.authIndex);
  if (!authIndex) throw new Error("missing_auth_index");

  const accountName = resolveAccountName(file);
  const accountId = resolveCodexChatgptAccountId(file) ?? "";
  const result: ApiCallResult = await apiCallApi.request({
    authIndex,
    method: "GET",
    url: CODEX_RESET_CREDITS_URL,
    header: buildCodexRequestHeaders(file),
  });

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(getApiCallErrorMessage(result));
  }

  const payload = parseResetCreditsPayload(result.body ?? result.bodyText);
  if (!payload) throw new Error("parse_codex_reset_credits_failed");

  const availableCount = normalizeNumberValue(payload.available_count ?? payload.availableCount);
  const totalEarnedCount = normalizeNumberValue(
    payload.total_earned_count ?? payload.totalEarnedCount,
  );

  return {
    fileName: file.name,
    accountName,
    accountId,
    availableCount: availableCount === null ? null : Math.max(0, Math.floor(availableCount)),
    totalEarnedCount:
      totalEarnedCount === null ? null : Math.max(0, Math.floor(totalEarnedCount)),
    credits: extractCreditRecords(payload).map((credit, index) =>
      normalizeCreditRow(credit, index, { accountName, accountId }, t),
    ),
  };
};

const sumKnownCounts = (counts: (number | null)[]): CountSummary =>
  counts.reduce<CountSummary>(
    (summary, count) =>
      count === null ? summary : { known: true, value: summary.value + count },
    { known: false, value: 0 },
  );

const formatCountSummary = (summary: CountSummary): string =>
  summary.known ? summary.value.toLocaleString() : "--";

const getStatusClassName = (status: string): string => {
  const normalized = status.toLowerCase();
  if (/available|active|granted|ready/u.test(normalized)) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
  if (/redeemed|used|consumed/u.test(normalized)) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200";
  }
  if (/expired|failed|error/u.test(normalized)) {
    return "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200";
  }
  return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70";
};

const translateLoadError = (
  message: string,
  t: (key: string, values?: Record<string, unknown>) => string,
): string => {
  if (message === "missing_auth_index") {
    return t("auth_files.codex_reset_credits_missing_auth_index");
  }
  if (message === "parse_codex_reset_credits_failed") {
    return t("auth_files.codex_reset_credits_parse_failed");
  }
  return message;
};

export function CodexResetCreditsSection({
  files,
  loading: authFilesLoading = false,
}: {
  files: AuthFileItem[];
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const requestIdRef = useRef(0);
  const [state, setState] = useState<CodexResetCreditsState>({
    loading: false,
    loaded: false,
    accounts: [],
  });

  const codexFiles = useMemo(
    () => files.filter((file) => resolveAuthProvider(file) === "codex"),
    [files],
  );
  const queryableFiles = useMemo(
    () =>
      codexFiles.filter((file) =>
        Boolean(normalizeAuthIndexValue(file.auth_index ?? file.authIndex)),
      ),
    [codexFiles],
  );
  const querySignature = useMemo(
    () =>
      queryableFiles
        .map((file) =>
          [
            file.name,
            normalizeAuthIndexValue(file.auth_index ?? file.authIndex),
            resolveCodexChatgptAccountId(file) ?? "",
            file.modified ?? file.modtime ?? "",
          ].join("|"),
        )
        .join("\n"),
    [queryableFiles],
  );

  const loadCredits = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (queryableFiles.length === 0) {
      setState({ loading: false, loaded: true, accounts: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    const accounts = await Promise.all(
      queryableFiles.map(async (file) => {
        try {
          return await fetchCreditsForFile(file, t);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            fileName: file.name,
            accountName: resolveAccountName(file),
            accountId: resolveCodexChatgptAccountId(file) ?? "",
            availableCount: null,
            totalEarnedCount: null,
            credits: [],
            error: translateLoadError(message, t),
          } satisfies CodexResetCreditsAccountResult;
        }
      }),
    );

    if (requestIdRef.current !== requestId) return;
    setState({ loading: false, loaded: true, accounts });
  }, [querySignature, queryableFiles, t]);

  useEffect(() => {
    if (authFilesLoading) return;
    void loadCredits();
  }, [authFilesLoading, loadCredits]);

  const rows = useMemo(
    () =>
      state.accounts
        .flatMap((account) => account.credits)
        .sort((left, right) => {
          const leftTime = Date.parse(left.grantedAtRaw) || 0;
          const rightTime = Date.parse(right.grantedAtRaw) || 0;
          return rightTime - leftTime;
        }),
    [state.accounts],
  );
  const failedAccounts = state.accounts.filter((account) => account.error);
  const skippedCount = codexFiles.length - queryableFiles.length;
  const availableSummary = sumKnownCounts(state.accounts.map((account) => account.availableCount));
  const totalEarnedSummary = sumKnownCounts(
    state.accounts.map((account) => account.totalEarnedCount),
  );
  const showLoading = authFilesLoading || state.loading;
  const showEmpty = state.loaded && !showLoading && rows.length === 0;

  return (
    <Card padding="none" className="overflow-hidden" bodyClassName="min-w-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-neutral-800/60">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Gift size={17} className="shrink-0 text-slate-500 dark:text-white/55" />
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {t("auth_files.codex_reset_credits_title")}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
            {t("auth_files.codex_reset_credits_desc")}
          </p>
        </div>

        <HoverTooltip content={t("auth_files.codex_reset_credits_refresh")}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadCredits()}
            disabled={showLoading || queryableFiles.length === 0}
            aria-label={t("auth_files.codex_reset_credits_refresh")}
            title={t("auth_files.codex_reset_credits_refresh")}
          >
            {showLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
          </Button>
        </HoverTooltip>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:px-5">
        {[
          {
            label: t("auth_files.codex_reset_credits_accounts_metric"),
            value: queryableFiles.length.toLocaleString(),
          },
          {
            label: t("auth_files.codex_reset_credits_available_metric"),
            value: formatCountSummary(availableSummary),
          },
          {
            label: t("auth_files.codex_reset_credits_total_metric"),
            value: formatCountSummary(totalEarnedSummary),
          },
          {
            label: t("auth_files.codex_reset_credits_records_metric"),
            value: rows.length.toLocaleString(),
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]"
          >
            <p className="truncate text-[11px] font-medium text-slate-500 dark:text-white/45">
              {metric.label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {showLoading && rows.length === 0 ? (
        <div className="border-t border-slate-100 p-4 sm:px-5 dark:border-neutral-800/60">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:bg-white/[0.04] dark:text-white/65">
            <Loader2 size={16} className="animate-spin" />
            <span>{t("auth_files.codex_reset_credits_loading")}</span>
          </div>
        </div>
      ) : null}

      {showEmpty ? (
        <div className="border-t border-slate-100 p-4 sm:px-5 dark:border-neutral-800/60">
          <EmptyState
            title={
              codexFiles.length === 0
                ? t("auth_files.codex_reset_credits_no_codex")
                : t("auth_files.codex_reset_credits_empty")
            }
            description={
              skippedCount > 0
                ? t("auth_files.codex_reset_credits_skipped", { count: skippedCount })
                : t("auth_files.codex_reset_credits_empty_desc")
            }
          />
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto border-t border-slate-100 dark:border-neutral-800/60">
          <table className="min-w-[920px] w-full divide-y divide-slate-100 text-left text-xs dark:divide-neutral-800/60">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500 dark:bg-white/[0.03] dark:text-white/45">
              <tr>
                <th className="px-4 py-3 sm:px-5">
                  {t("auth_files.codex_reset_credits_account_header")}
                </th>
                <th className="px-4 py-3">{t("auth_files.codex_reset_credits_source_header")}</th>
                <th className="px-4 py-3">{t("auth_files.codex_reset_credits_status_header")}</th>
                <th className="px-4 py-3">
                  {t("auth_files.codex_reset_credits_granted_at_header")}
                </th>
                <th className="px-4 py-3">
                  {t("auth_files.codex_reset_credits_expires_at_header")}
                </th>
                <th className="px-4 py-3 sm:pr-5">
                  {t("auth_files.codex_reset_credits_used_at_header")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-neutral-800/60 dark:text-white/70">
              {rows.map((row) => (
                <tr key={`${row.accountName}-${row.id}`}>
                  <td className="max-w-[14rem] px-4 py-3 align-top sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {row.accountName}
                      </p>
                      {row.accountId ? (
                        <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-white/35">
                          {row.accountId}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="max-w-[20rem] px-4 py-3 align-top">
                    <span className="block min-w-0 truncate">{row.source}</span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={[
                        "inline-flex max-w-36 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        getStatusClassName(row.status),
                      ].join(" ")}
                    >
                      <span className="truncate">{row.status}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums">
                    {row.grantedAt || "--"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums">
                    {row.expiresAt || "--"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top tabular-nums sm:pr-5">
                    {row.usedAt || "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {failedAccounts.length > 0 ? (
        <div className="space-y-2 border-t border-slate-100 p-4 text-xs sm:px-5 dark:border-neutral-800/60">
          {failedAccounts.map((account) => (
            <div
              key={account.fileName}
              className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
            >
              <span className="font-semibold">
                {t("auth_files.codex_reset_credits_account_failed", {
                  account: account.accountName,
                })}
              </span>
              <span className="ml-1 break-words">{account.error}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

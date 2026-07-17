import type { PublicUsageLimits } from "../types";

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}

type QuotaRow = {
  key: string;
  label: string;
  usedLabel: string;
  limitLabel: string;
};

export function QuotaLimitsBanner({
  t,
  limits,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  limits: PublicUsageLimits | null | undefined;
}) {
  if (!limits) return null;

  const rows: QuotaRow[] = [];
  if (typeof limits["daily-limit"] === "number" && limits["daily-limit"] > 0) {
    rows.push({
      key: "daily-limit",
      label: t("apikey_lookup.quota_daily_requests"),
      usedLabel: formatCount(limits["daily-used"] ?? 0),
      limitLabel: formatCount(limits["daily-limit"]),
    });
  }
  if (typeof limits["total-quota"] === "number" && limits["total-quota"] > 0) {
    rows.push({
      key: "total-quota",
      label: t("apikey_lookup.quota_total_requests"),
      usedLabel: formatCount(limits["total-used"] ?? 0),
      limitLabel: formatCount(limits["total-quota"]),
    });
  }
  if (
    typeof limits["daily-spending-limit"] === "number" &&
    limits["daily-spending-limit"] > 0
  ) {
    rows.push({
      key: "daily-spending",
      label: t("apikey_lookup.quota_daily_spending"),
      usedLabel: formatUsd(limits["daily-spending-used"] ?? 0),
      limitLabel: formatUsd(limits["daily-spending-limit"]),
    });
  }
  if (
    typeof limits["spending-limit"] === "number" &&
    limits["spending-limit"] > 0
  ) {
    rows.push({
      key: "spending",
      label: t("apikey_lookup.quota_total_spending"),
      usedLabel: formatUsd(limits["spending-used"] ?? 0),
      limitLabel: formatUsd(limits["spending-limit"]),
    });
  }

  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10"
      data-testid="api-key-lookup-quota-limits"
    >
      <div className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
        {t("apikey_lookup.quota_limits_title")}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.key}
            className="rounded-xl border border-amber-100/80 bg-white/70 px-3 py-2 dark:border-amber-500/10 dark:bg-neutral-950/40"
          >
            <div className="text-xs text-amber-800/80 dark:text-amber-100/70">
              {row.label}
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-amber-950 dark:text-amber-50">
              {row.usedLabel}
              <span className="mx-1 font-normal text-amber-700/60 dark:text-amber-100/40">
                /
              </span>
              {row.limitLabel}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

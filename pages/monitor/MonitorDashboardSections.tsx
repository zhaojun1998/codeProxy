import { Activity, ChartSpline, Clock, Coins, ShieldCheck, Sigma, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { HourWindow } from "@features/monitor-widgets/monitor-constants";
import { formatNumber, formatRate } from "@features/monitor-widgets/monitor-utils";
import { formatFixedNumber } from "@code-proxy/domain";
import type { UsageLogPerformanceStats } from "@code-proxy/api-client/endpoints/usage";
import { AnimatedNumber } from "@code-proxy/ui";
import { Reveal } from "@code-proxy/ui";
import { EChart } from "@code-proxy/ui";
import { ChartLegend } from "@code-proxy/ui";
import { Tabs, TabsList, TabsTrigger } from "@code-proxy/ui";
import { HourWindowSelector, KpiCard, MonitorCard as Card } from "@features/monitor-widgets";
import { ModelTag } from "@features/model-tags";

const formatTtfb = (value: number) => `${formatFixedNumber(value, { fractionDigits: 0 })} ms`;
const formatTps = (value: number) => formatFixedNumber(value, { fractionDigits: 1 });

function useDeferredMount(delayMs = 120) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return mounted;
}

export function MonitorKpiSection({
  t,
  metrics,
  hasData,
  isLoading,
  refreshData,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  metrics: {
    totalRequests: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    avgTtfbMs: number;
    minTtfbMs: number;
    maxTtfbMs: number;
    tokensPerSecond: number;
    minTokensPerSecond: number;
    maxTokensPerSecond: number;
  };
  hasData: boolean;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}) {
  return (
    <>
      <Reveal>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard
            title={t("monitor.total_requests")}
            value={<AnimatedNumber value={metrics.totalRequests} format={formatNumber} />}
            hint={t("monitor.filtered_by_time")}
            icon={Activity}
          />
          <KpiCard
            title={t("monitor.success_rate")}
            value={<AnimatedNumber value={metrics.successRate} format={formatRate} />}
            hint={t("monitor.success_count", {
              success: formatNumber(metrics.successCount),
              failed: formatNumber(metrics.failureCount),
            })}
            icon={ShieldCheck}
          />
          <KpiCard
            title={t("monitor.total_token")}
            value={<AnimatedNumber value={metrics.totalTokens} format={formatNumber} />}
            hint={t("monitor.input_output_hint")}
            icon={Sigma}
          />
          <KpiCard
            title={t("monitor.output_token")}
            value={<AnimatedNumber value={metrics.outputTokens} format={formatNumber} />}
            hint={t("monitor.input_tokens_hint", {
              count: formatNumber(metrics.inputTokens),
            } as Record<string, unknown>)}
            icon={Coins}
          />
          <KpiCard
            title={t("monitor.avg_ttfb")}
            value={<AnimatedNumber value={metrics.avgTtfbMs} format={formatTtfb} />}
            hint={t("monitor.ttfb_hint", {
              min: formatTtfb(metrics.minTtfbMs),
              max: formatTtfb(metrics.maxTtfbMs),
            })}
            icon={Clock}
          />
          <KpiCard
            title={t("monitor.tokens_per_second")}
            value={<AnimatedNumber value={metrics.tokensPerSecond} format={formatTps} />}
            hint={t("monitor.tps_hint", {
              min: formatTps(metrics.minTokensPerSecond),
              max: formatTps(metrics.maxTokensPerSecond),
            })}
            icon={Zap}
          />
        </section>
      </Reveal>

      {!hasData && !isLoading ? (
        <Reveal>
          <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-white/70">
                <ChartSpline size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("monitor.no_data")}
              </p>
              <p className="text-sm text-slate-600 dark:text-white/65">
                {t("monitor.no_data_hint")}
              </p>
              <button
                type="button"
                onClick={() => void refreshData()}
                className="inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-slate-200"
              >
                {t("monitor.refresh")}
              </button>
            </div>
          </section>
        </Reveal>
      ) : null}
    </>
  );
}

export function MonitorPerformanceSection({
  t,
  stats,
  isRefreshing,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  stats: UsageLogPerformanceStats[];
  isRefreshing: boolean;
}) {
  if (stats.length === 0 && !isRefreshing) return null;

  return (
    <Reveal>
      <Card
        title={t("monitor.performance_by_model_effort")}
        description={t("monitor.performance_by_model_effort_desc")}
        loading={isRefreshing}
      >
        <div className="max-h-72 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-white/95 text-xs text-slate-500 backdrop-blur dark:bg-neutral-950/95 dark:text-white/45">
              <tr>
                <th className="px-3 py-2 font-medium">{t("monitor.performance_model")}</th>
                <th className="px-3 py-2 font-medium">{t("monitor.reasoning_effort")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("monitor.requests")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("monitor.avg_ttfb")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("monitor.tokens_per_second")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
              {stats.map((item) => (
                <tr key={`${item.model}::${item.reasoning_effort}`}>
                  <td className="px-3 py-2">
                    {item.model ? <ModelTag id={item.model} size="sm" /> : "--"}
                  </td>
                  <td className="px-3 py-2 font-mono text-violet-700 dark:text-violet-300">
                    {item.reasoning_effort || t("monitor.reasoning_default")}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {item.request_count}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-sky-700 dark:text-sky-300">
                    {item.ttfb_sample_count > 0
                      ? `${formatFixedNumber(item.avg_ttfb_ms, { fractionDigits: 0 })} ms`
                      : "--"}
                    {item.ttfb_sample_count > 0 ? (
                      <span className="ml-1 text-2xs text-slate-400 dark:text-white/35">
                        ({formatFixedNumber(item.min_ttfb_ms, { fractionDigits: 0 })}–
                        {formatFixedNumber(item.max_ttfb_ms, { fractionDigits: 0 })})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-violet-700 dark:text-violet-300">
                    {item.throughput_sample_count > 0
                      ? `${formatFixedNumber(item.tokens_per_second, { fractionDigits: 1 })} t/s`
                      : "--"}
                    {item.throughput_sample_count > 0 ? (
                      <span className="ml-1 text-2xs text-slate-400 dark:text-white/35">
                        ({formatFixedNumber(item.min_tokens_per_second, { fractionDigits: 1 })}–
                        {formatFixedNumber(item.max_tokens_per_second, { fractionDigits: 1 })})
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Reveal>
  );
}

export function MonitorDistributionSections({
  t,
  timeRange,
  modelMetric,
  setModelMetric,
  modelDistributionOption,
  modelDistributionLegend,
  toggleModelDistributionLegend,
  dailyTrendOption,
  dailyLegendAvailability,
  dailyLegendSelected,
  toggleDailyLegend,
  apikeyDistributionData,
  apikeyMetric,
  setApikeyMetric,
  apikeyDistributionOption,
  apikeyDistributionLegend,
  toggleApikeyDistributionLegend,
  isRefreshing,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  timeRange: number;
  modelMetric: "requests" | "tokens";
  setModelMetric: (value: "requests" | "tokens") => void;
  modelDistributionOption: Record<string, unknown>;
  modelDistributionLegend: Array<{
    name: string;
    valueLabel: string;
    percentLabel: string;
    colorClass: string;
    enabled: boolean;
  }>;
  toggleModelDistributionLegend: (name: string) => void;
  dailyTrendOption: Record<string, unknown>;
  dailyLegendAvailability: { hasInput: boolean; hasOutput: boolean; hasRequests: boolean };
  dailyLegendSelected: Record<string, boolean>;
  toggleDailyLegend: (key: string) => void;
  apikeyDistributionData: Array<{ name: string; value: number }>;
  apikeyMetric: "requests" | "tokens";
  setApikeyMetric: (value: "requests" | "tokens") => void;
  apikeyDistributionOption: Record<string, unknown>;
  apikeyDistributionLegend: Array<{
    name: string;
    valueLabel: string;
    percentLabel: string;
    colorClass: string;
    enabled: boolean;
  }>;
  toggleApikeyDistributionLegend: (name: string) => void;
  isRefreshing: boolean;
}) {
  const modelActions = (
    <Tabs value={modelMetric} onValueChange={(next) => setModelMetric(next as typeof modelMetric)}>
      <TabsList>
        <TabsTrigger value="requests">{t("monitor.requests")}</TabsTrigger>
        <TabsTrigger value="tokens">{t("monitor.token")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const apikeyActions = (
    <Tabs
      value={apikeyMetric}
      onValueChange={(next) => setApikeyMetric(next as typeof apikeyMetric)}
    >
      <TabsList>
        <TabsTrigger value="requests">{t("monitor.requests")}</TabsTrigger>
        <TabsTrigger value="tokens">{t("monitor.token")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <Card
          title={t("monitor.model_distribution")}
          description={t("monitor.last_days_desc", {
            days: timeRange,
            metric: modelMetric === "requests" ? t("monitor.requests") : t("monitor.token"),
          })}
          actions={modelActions}
          loading={isRefreshing}
        >
          <div className="flex h-auto flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:items-center">
            <EChart option={modelDistributionOption} className="h-56 min-w-0 md:h-[22rem]" />
            <div className="flex h-auto flex-col justify-start gap-2 overflow-y-auto pr-2 md:max-h-[22rem]">
              {modelDistributionLegend.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={item.enabled}
                  onClick={() => toggleModelDistributionLegend(item.name)}
                  className={[
                    "grid w-full grid-cols-[minmax(0,1fr)_max-content_max-content] items-center gap-x-3 rounded-xl px-2 py-1.5 text-left text-sm transition",
                    item.enabled
                      ? "text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
                      : "text-slate-400 opacity-60 hover:bg-slate-50 dark:text-white/35 dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-full ${item.colorClass} opacity-80 ring-1 ring-black/5 dark:ring-white/10`}
                    />
                    <span className="min-w-0 truncate text-slate-700 dark:text-white/80">
                      {item.name}
                    </span>
                  </div>
                  <span className="min-w-[3.5rem] whitespace-nowrap text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                    {item.valueLabel}
                  </span>
                  <span className="min-w-[4.25rem] whitespace-nowrap text-right tabular-nums text-slate-500 dark:text-white/55">
                    {item.percentLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title={t("monitor.daily_usage_trend")}
          description={t("monitor.daily_desc", { days: timeRange })}
          loading={isRefreshing}
        >
          <div className="flex h-72 min-w-0 flex-col overflow-hidden">
            <EChart
              option={dailyTrendOption}
              className="min-h-0 flex-1 min-w-0"
              replaceMerge="series"
            />
            <ChartLegend
              className="shrink-0 pt-4"
              items={[
                ...(dailyLegendAvailability.hasInput
                  ? [
                      {
                        key: "daily_input",
                        label: t("monitor.input_token"),
                        colorClass: "bg-violet-400",
                        enabled: dailyLegendSelected["daily_input"] ?? true,
                        onToggle: toggleDailyLegend,
                      },
                    ]
                  : []),
                ...(dailyLegendAvailability.hasOutput
                  ? [
                      {
                        key: "daily_output",
                        label: t("monitor.output_token_legend"),
                        colorClass: "bg-emerald-400",
                        enabled: dailyLegendSelected["daily_output"] ?? true,
                        onToggle: toggleDailyLegend,
                      },
                    ]
                  : []),
                ...(dailyLegendAvailability.hasRequests
                  ? [
                      {
                        key: "daily_requests",
                        label: t("monitor.requests"),
                        colorClass: "bg-blue-500",
                        enabled: dailyLegendSelected["daily_requests"] ?? true,
                        onToggle: toggleDailyLegend,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </Card>
      </section>

      {apikeyDistributionData.length > 0 ? (
        <Card
          title={t("monitor.apikey_distribution")}
          description={t("monitor.apikey_distribution_desc", {
            days: timeRange,
            metric: apikeyMetric === "requests" ? t("monitor.requests") : t("monitor.token"),
          })}
          actions={apikeyActions}
          loading={isRefreshing}
        >
          <div className="flex h-auto flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:items-center">
            <EChart option={apikeyDistributionOption} className="h-56 min-w-0 md:h-[22rem]" />
            <div className="flex h-auto flex-col justify-start gap-2 overflow-y-auto pr-2 md:max-h-[22rem]">
              {apikeyDistributionLegend.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={item.enabled}
                  onClick={() => toggleApikeyDistributionLegend(item.name)}
                  className={[
                    "grid w-full grid-cols-[minmax(0,1fr)_max-content_max-content] items-center gap-x-3 rounded-xl px-2 py-1.5 text-left text-sm transition",
                    item.enabled
                      ? "text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10"
                      : "text-slate-400 opacity-60 hover:bg-slate-50 dark:text-white/35 dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-full ${item.colorClass} opacity-80 ring-1 ring-black/5 dark:ring-white/10`}
                    />
                    <span className="min-w-0 truncate text-slate-700 dark:text-white/80">
                      {item.name}
                    </span>
                  </div>
                  <span className="min-w-[3.5rem] whitespace-nowrap text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                    {item.valueLabel}
                  </span>
                  <span className="min-w-[4.25rem] whitespace-nowrap text-right tabular-nums text-slate-500 dark:text-white/55">
                    {item.percentLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : null}
    </>
  );
}

export function MonitorHourlySections({
  t,
  isRefreshing,
  modelHourWindow,
  setModelHourWindow,
  hourlyModelLegendKeys,
  hourlyModelOption,
  hourlySeries,
  getHourlyModelSeriesLabel,
  hourlyModelPalette,
  hourlyModelSelected,
  toggleHourlyModelLegend,
  tokenHourWindow,
  setTokenHourWindow,
  hourlyTokenOption,
  hourlyTokenLabels,
  hourlyTokenPalette,
  hourlyTokenSelected,
  toggleHourlyTokenLegend,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  isRefreshing: boolean;
  modelHourWindow: HourWindow;
  setModelHourWindow: (value: HourWindow) => void;
  hourlyModelLegendKeys: string[];
  hourlyModelOption: Record<string, unknown>;
  hourlySeries: {
    modelKeys: string[];
    tokenKeys: string[];
  };
  getHourlyModelSeriesLabel: (key: string) => string;
  hourlyModelPalette: { classByKey: Record<string, string> };
  hourlyModelSelected: Record<string, boolean>;
  toggleHourlyModelLegend: (key: string) => void;
  tokenHourWindow: HourWindow;
  setTokenHourWindow: (value: HourWindow) => void;
  hourlyTokenOption: Record<string, unknown>;
  hourlyTokenLabels: Record<string, string>;
  hourlyTokenPalette: { classByKey: Record<string, string> };
  hourlyTokenSelected: Record<string, boolean>;
  toggleHourlyTokenLegend: (key: string) => void;
}) {
  const shouldRenderCharts = useDeferredMount();

  return (
    <section className="space-y-4">
      {shouldRenderCharts ? (
        <>
          <Card
            title={t("monitor.hourly_model.title")}
            description={t("monitor.hourly_model_desc")}
            actions={<HourWindowSelector value={modelHourWindow} onChange={setModelHourWindow} />}
            loading={isRefreshing}
          >
            <EChart option={hourlyModelOption} className="h-64 sm:h-72" replaceMerge="series" />
            <ChartLegend
              className="max-h-32 justify-start overflow-y-auto pt-4 sm:max-h-none sm:justify-center"
              items={hourlyModelLegendKeys.map((key) => ({
                key,
                label: getHourlyModelSeriesLabel(key),
                colorClass: hourlyModelPalette.classByKey[key] ?? "bg-slate-400",
                enabled: hourlyModelSelected[key] ?? true,
                onToggle: toggleHourlyModelLegend,
              }))}
            />
          </Card>

          <Card
            title={t("monitor.hourly_token.title")}
            description={t("monitor.hourly_token_desc")}
            actions={<HourWindowSelector value={tokenHourWindow} onChange={setTokenHourWindow} />}
            loading={isRefreshing}
          >
            <EChart option={hourlyTokenOption} className="h-64 sm:h-72" replaceMerge="series" />
            <ChartLegend
              className="max-h-32 justify-start overflow-y-auto pt-4 sm:max-h-none sm:justify-center"
              items={hourlySeries.tokenKeys.map((key) => ({
                key,
                label: hourlyTokenLabels[key] ?? key,
                colorClass: hourlyTokenPalette.classByKey[key] ?? "bg-slate-400",
                enabled: hourlyTokenSelected[key] ?? true,
                onToggle: toggleHourlyTokenLegend,
              }))}
            />
          </Card>
        </>
      ) : (
        <div aria-hidden="true" className="min-h-[42rem]" />
      )}
    </section>
  );
}

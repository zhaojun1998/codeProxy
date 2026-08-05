import type { UsageLogPerformanceStats } from "@code-proxy/api-client/endpoints/usage";

type PerformanceChartLabels = {
  avgTtfb: string;
  tokensPerSecond: string;
  defaultEffort: string;
  fast: string;
  standard: string;
  requests: (count: number) => string;
  ttfbRange: (item: UsageLogPerformanceStats) => string;
  tpsRange: (item: UsageLogPerformanceStats) => string;
};

type PerformanceChartDatum = {
  value: [number, number, number];
  symbol: string;
  itemStyle: {
    color: string;
    borderColor: string;
    borderWidth: number;
    opacity: number;
  };
  performance: UsageLogPerformanceStats;
};

const SYMBOLS = ["circle", "rect", "diamond", "triangle", "roundRect", "pin", "arrow"];

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });

export function createPerformanceChartOption(input: {
  stats: UsageLogPerformanceStats[];
  models: string[];
  efforts: string[];
  colorsByModel: Record<string, string>;
  labels: PerformanceChartLabels;
  isDark: boolean;
}): Record<string, unknown> {
  const chartableStats = input.stats.filter(
    (item) => item.ttfb_sample_count > 0 && item.throughput_sample_count > 0,
  );
  const maxRequests = Math.max(1, ...chartableStats.map((item) => item.request_count));
  const effortSymbols = new Map(
    input.efforts.map((effort, index) => [effort, SYMBOLS[index % SYMBOLS.length]]),
  );

  const series = input.models
    .map((model) => {
      const data: PerformanceChartDatum[] = chartableStats
        .filter((item) => item.model === model)
        .map((item) => ({
          value: [item.avg_ttfb_ms, item.tokens_per_second, item.request_count],
          symbol: effortSymbols.get(item.thinking_level) ?? "circle",
          itemStyle: {
            color: input.colorsByModel[model] ?? "#94a3b8",
            borderColor: item.fast
              ? "#f59e0b"
              : input.isDark
                ? "rgba(255,255,255,0.45)"
                : "rgba(15,23,42,0.35)",
            borderWidth: item.fast ? 3 : 1,
            opacity: 0.88,
          },
          performance: item,
        }));

      return {
        name: model,
        type: "scatter",
        data,
        symbolSize: (value: [number, number, number]) =>
          12 + Math.sqrt(Math.max(0, value[2]) / maxRequests) * 22,
        emphasis: {
          focus: "series",
          scale: 1.18,
          itemStyle: { opacity: 1 },
        },
      };
    })
    .filter((item) => item.data.length > 0);

  return {
    backgroundColor: "transparent",
    legend: { show: false },
    grid: { left: 18, right: 24, top: 24, bottom: 22, containLabel: true },
    tooltip: {
      trigger: "item",
      renderMode: "html",
      appendToBody: true,
      confine: true,
      borderWidth: 0,
      backgroundColor: "rgba(15, 23, 42, 0.94)",
      textStyle: { color: "#fff" },
      extraCssText: "z-index: 10000; border-radius: 12px; padding: 10px 12px;",
      formatter: (params: { data?: PerformanceChartDatum }) => {
        const item = params.data?.performance;
        if (!item) return "";
        const effort = item.thinking_level || input.labels.defaultEffort;
        const mode = item.fast ? input.labels.fast : input.labels.standard;
        return [
          `<strong>${escapeHtml(item.model)}</strong>`,
          `${escapeHtml(effort)} · ${escapeHtml(mode)}`,
          escapeHtml(input.labels.requests(item.request_count)),
          escapeHtml(input.labels.ttfbRange(item)),
          escapeHtml(input.labels.tpsRange(item)),
        ].join("<br/>");
      },
    },
    xAxis: {
      type: "value",
      scale: true,
      name: input.labels.avgTtfb,
      nameLocation: "middle",
      nameGap: 32,
      axisLabel: { formatter: (value: number) => `${Math.round(value)} ms` },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: input.isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.22)",
        },
      },
    },
    yAxis: {
      type: "value",
      scale: true,
      name: input.labels.tokensPerSecond,
      nameLocation: "middle",
      nameGap: 46,
      axisLabel: { formatter: (value: number) => `${value.toFixed(1)} t/s` },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: input.isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.22)",
        },
      },
    },
    series,
    animationEasing: "cubicOut" as const,
    animationDuration: 520,
    animationDurationUpdate: 360,
  };
}

import { describe, expect, test } from "vitest";
import { createPerformanceChartOption } from "@pages/monitor/performance-chart-options";

const baseStats = {
  model: "gpt-5.4",
  thinking_level: "high",
  fast: true,
  request_count: 4,
  ttfb_sample_count: 4,
  avg_ttfb_ms: 180,
  min_ttfb_ms: 120,
  max_ttfb_ms: 260,
  throughput_sample_count: 4,
  tokens_per_second: 80,
  min_tokens_per_second: 60,
  max_tokens_per_second: 95,
};

describe("performance chart options", () => {
  test("encodes model, reasoning effort, fast mode, and request volume", () => {
    const option = createPerformanceChartOption({
      stats: [baseStats, { ...baseStats, thinking_level: "low", fast: false }],
      models: ["gpt-5.4"],
      efforts: ["high", "low"],
      colorsByModel: { "gpt-5.4": "#60a5fa" },
      isDark: false,
      labels: {
        avgTtfb: "Avg TTFB",
        tokensPerSecond: "Tokens/sec",
        defaultEffort: "Default",
        fast: "Fast",
        standard: "Standard",
        requests: (count) => `Requests: ${count}`,
        ttfbRange: () => "TTFB range",
        tpsRange: () => "TPS range",
      },
    });

    const series = option.series as Array<{ data: Array<Record<string, unknown>> }>;
    expect(series).toHaveLength(1);
    expect(series[0].data).toHaveLength(2);
    expect(series[0].data[0]).toMatchObject({
      value: [180, 80, 4],
      symbol: "circle",
      itemStyle: { borderColor: "#f59e0b", borderWidth: 3 },
    });
    expect(series[0].data[1]).toMatchObject({
      symbol: "rect",
      itemStyle: { borderWidth: 1 },
    });
  });
});

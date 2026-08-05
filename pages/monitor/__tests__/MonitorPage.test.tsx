import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  MonitorDistributionSections,
  MonitorPerformanceSection,
} from "@pages/monitor/MonitorDashboardSections";

vi.mock("@code-proxy/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@code-proxy/ui")>()),
  EChart: ({ className }: { className?: string }) => <div className={className}>chart</div>,
}));

describe("MonitorPage distribution legends", () => {
  test("renders model distribution legend rows as toggle buttons", async () => {
    const user = userEvent.setup();
    const toggleModelDistributionLegend = vi.fn();

    render(
      <MonitorDistributionSections
        t={(key) => {
          if (key === "monitor.model_distribution") return "Model distribution";
          if (key === "monitor.last_days_desc") return "Last 7 days";
          if (key === "monitor.requests") return "Requests";
          if (key === "monitor.token") return "Tokens";
          if (key === "monitor.daily_usage_trend") return "Daily usage";
          if (key === "monitor.daily_desc") return "Daily trend";
          if (key === "monitor.input_token") return "Input";
          if (key === "monitor.output_token_legend") return "Output";
          if (key === "monitor.request_count_legend") return "Requests";
          if (key === "monitor.apikey_distribution") return "API key distribution";
          return key;
        }}
        timeRange={7}
        modelMetric="requests"
        setModelMetric={() => undefined}
        modelDistributionOption={{}}
        modelDistributionLegend={[
          {
            name: "gpt-4.1",
            valueLabel: "10",
            percentLabel: "71.4%",
            colorClass: "bg-sky-500",
            enabled: true,
          },
        ]}
        toggleModelDistributionLegend={toggleModelDistributionLegend}
        dailyTrendOption={{}}
        dailyLegendAvailability={{ hasInput: true, hasOutput: true, hasRequests: true }}
        dailyLegendSelected={{ daily_input: true, daily_output: true, daily_requests: true }}
        toggleDailyLegend={() => undefined}
        apikeyDistributionData={[]}
        apikeyMetric="requests"
        setApikeyMetric={() => undefined}
        apikeyDistributionOption={{}}
        apikeyDistributionLegend={[]}
        toggleApikeyDistributionLegend={() => undefined}
        isRefreshing={false}
      />,
    );

    const legendButton = await screen.findByRole("button", { name: /gpt-4\.1/i });
    expect(legendButton).toHaveAttribute("aria-pressed", "true");

    await user.click(legendButton);

    await waitFor(() => {
      expect(toggleModelDistributionLegend).toHaveBeenCalledWith("gpt-4.1");
    });
  });
});

describe("MonitorPage performance legends", () => {
  test("filters model, reasoning effort, and fast mode independently", async () => {
    const user = userEvent.setup();
    const labels: Record<string, string> = {
      "monitor.performance_by_model_effort": "Performance",
      "monitor.performance_by_model_effort_desc": "Performance chart",
      "monitor.performance_model": "Model",
      "monitor.reasoning_effort": "Reasoning",
      "monitor.performance_mode": "Mode",
      "monitor.fast_mode": "Fast",
      "monitor.standard_mode": "Standard",
      "monitor.avg_ttfb": "Avg TTFB",
      "monitor.tokens_per_second": "Tokens/sec",
      "monitor.reasoning_default": "Default",
    };

    render(
      <MonitorPerformanceSection
        t={(key) => labels[key] ?? key}
        isRefreshing={false}
        isDark={false}
        stats={[
          {
            model: "gpt-5.4",
            reasoning_effort: "high",
            fast: true,
            request_count: 3,
            ttfb_sample_count: 3,
            avg_ttfb_ms: 200,
            min_ttfb_ms: 150,
            max_ttfb_ms: 250,
            throughput_sample_count: 3,
            tokens_per_second: 70,
            min_tokens_per_second: 60,
            max_tokens_per_second: 80,
          },
          {
            model: "gpt-5.4",
            reasoning_effort: "low",
            fast: false,
            request_count: 2,
            ttfb_sample_count: 2,
            avg_ttfb_ms: 260,
            min_ttfb_ms: 220,
            max_ttfb_ms: 300,
            throughput_sample_count: 2,
            tokens_per_second: 55,
            min_tokens_per_second: 50,
            max_tokens_per_second: 60,
          },
        ]}
      />,
    );

    const model = screen.getByRole("button", { name: "gpt-5.4" });
    const reasoning = screen.getByRole("button", { name: "high" });
    const fast = screen.getByRole("button", { name: "Fast" });

    await user.click(model);
    await user.click(reasoning);
    await user.click(fast);

    expect(model).toHaveAttribute("aria-pressed", "false");
    expect(reasoning).toHaveAttribute("aria-pressed", "false");
    expect(fast).toHaveAttribute("aria-pressed", "false");
  });
});

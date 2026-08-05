import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import i18n from "@code-proxy/i18n";
import { ThemeProvider, ToastProvider } from "@code-proxy/ui";
import { LogsPanel } from "../LogsPanel";

const mocks = vi.hoisted(() => ({
  listLogs: vi.fn(),
  clearLogs: vi.fn(),
}));

vi.mock("@code-proxy/api-client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@code-proxy/api-client")>();
  return {
    ...mod,
    promptFilterApi: {
      ...mod.promptFilterApi,
      listLogs: mocks.listLogs,
      clearLogs: mocks.clearLogs,
    },
  };
});

describe("LogsPanel", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("zh-CN");
    mocks.listLogs.mockResolvedValue({
      items: [
        {
          id: 1,
          request_log_id: 10,
          created_at: "2026-08-05T08:00:00Z",
          source: "local_filter",
          endpoint: "POST /v1/responses",
          model: "gpt-5.4",
          action: "warn",
          mode: "warn",
          score: 42,
          threshold: 40,
          matched_patterns: "[]",
          text_preview: "",
          full_text: "",
          api_key: "sk-t...test",
          client_ip: "127.0.0.1",
          error_code: "",
          review_model: "review-model",
          review_provider: "primary",
          review_latency_ms: 120,
          reviewed: true,
          review_flagged: true,
          review_confidence: 0.87,
          review_error: "",
          reason: "针对他人系统攻击",
        },
      ],
      total: 1,
      page: 1,
      size: 20,
    });
  });

  afterEach(() => {
    mocks.listLogs.mockReset();
    mocks.clearLogs.mockReset();
  });

  test("renders AI review confidence and shows the review reason on hover", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ToastProvider>
            <LogsPanel />
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const table = await screen.findByRole("table", { name: "拦截日志" });
    expect(within(table).getByRole("columnheader", { name: "AI 复审置信度" })).toBeInTheDocument();
    const confidence = within(table).getByText("87%");
    await user.hover(confidence);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("针对他人系统攻击");
  });
});

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import i18n from "@code-proxy/i18n";
import { ThemeProvider, ToastProvider } from "@code-proxy/ui";
import { LogsPanel } from "../LogsPanel";

const mocks = vi.hoisted(() => ({
  listLogs: vi.fn(),
  clearLogs: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

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
          review_reasoning_content: "这是供应商返回的原始推理说明",
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
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "这是供应商返回的原始推理说明",
    );
  });

  test("reset clears request_log_id and does not reopen the detail modal", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={["/runtime/prompt-filter?tab=logs&request_log_id=146025"]}
      >
        <ThemeProvider>
          <ToastProvider>
            <LogsPanel />
            <LocationProbe />
          </ToastProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("dialog", { name: "日志详情" })).toBeInTheDocument();
    expect(mocks.listLogs).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ request_log_id: 146025 }),
    );

    await user.click(screen.getByRole("button", { name: "重置" }));

    await waitFor(() => {
      expect(mocks.listLogs).toHaveBeenNthCalledWith(
        2,
        expect.not.objectContaining({ request_log_id: expect.anything() }),
      );
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/runtime/prompt-filter?tab=logs",
      );
      expect(screen.queryByRole("dialog", { name: "日志详情" })).not.toBeInTheDocument();
    });
  });
});

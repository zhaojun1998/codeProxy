import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@code-proxy/i18n";
import { CodexResetCreditsSection } from "../CodexResetCreditsSection";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

vi.mock("@code-proxy/api-client", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@code-proxy/api-client")>();
  return {
    ...mod,
    apiCallApi: {
      ...mod.apiCallApi,
      request: mocks.request,
    },
  };
});

describe("CodexResetCreditsSection", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("zh-CN");
    mocks.request.mockReset();
    mocks.request.mockResolvedValue({
      statusCode: 200,
      header: {},
      bodyText: "",
      body: {
        available_count: 2,
        total_earned_count: 3,
        credits: [
          {
            id: "credit-1",
            title: "Thanks for using Codex",
            description: "Official reward",
            status: "available",
            granted_at: "2026-06-01T08:00:00.000Z",
            expires_at: "2026-07-01T08:00:00.000Z",
          },
        ],
      },
    });
  });

  test("renders earned reset card rewards from saved Codex auth files", async () => {
    render(
      <CodexResetCreditsSection
        files={[
          {
            name: "codex-primary.json",
            type: "codex",
            email: "codex@example.test",
            auth_index: "codex-auth-1",
            chatgpt_account_id: "acct_123",
          },
        ]}
      />,
    );

    expect(await screen.findByText("我获得的重置卡奖励")).toBeInTheDocument();
    expect(await screen.findByText("官方免费赠送")).toBeInTheDocument();
    expect(screen.getByText("available")).toBeInTheDocument();
    expect(screen.getByText("acct_123")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith(
        expect.objectContaining({
          authIndex: "codex-auth-1",
          method: "GET",
          url: "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits",
          header: expect.objectContaining({
            "Chatgpt-Account-Id": "acct_123",
          }),
        }),
      ),
    );
  });
});

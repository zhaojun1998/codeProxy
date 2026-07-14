import { beforeEach, describe, expect, test, vi } from "vitest";

const postMock = vi.fn();
const getMock = vi.fn();

vi.mock("../../client/client", () => ({
  apiClient: {
    post: postMock,
    get: getMock,
  },
}));

describe("prompt filter api", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  test("sends AI review live tests to the dedicated endpoint", async () => {
    const { promptFilterApi } = await import("@code-proxy/api-client/endpoints/prompt-filter");
    const review = {
      enabled: true,
      base_url: "https://review.example/v1",
      model: "review-model",
      audit_prompt: "Return JSON",
      confidence_threshold: 0.5,
      providers: [
        {
          id: "primary",
          name: "Primary",
          api_key: "test-key",
          base_url: "https://review.example/v1",
          model: "review-model",
          priority: 0,
        },
      ],
      timeout_seconds: 10,
      fail_closed: false,
    };
    postMock.mockResolvedValue({
      result: {
        flagged: false,
        confidence: 0.1,
        model: "review-model",
        provider: "Primary",
        latency_ms: 12,
        output: '{"confidence":0.1}',
      },
    });

    await promptFilterApi.testReview("hello", review);

    expect(postMock).toHaveBeenCalledWith("/prompt-filter/review/test", {
      text: "hello",
      review,
    });
  });

  test("includes AI review and interception filters when listing logs", async () => {
    const { promptFilterApi } = await import("@code-proxy/api-client/endpoints/prompt-filter");
    getMock.mockResolvedValue({ items: [], total: 0, page: 1, size: 50 });

    await promptFilterApi.listLogs({ reviewed: true, intercepted: false });

    expect(getMock).toHaveBeenCalledWith("/prompt-filter/logs?reviewed=true&intercepted=false");
  });
});

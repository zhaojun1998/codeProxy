import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@code-proxy/i18n";
import { VisualConfigEditor } from "@pages/config/visual/VisualConfigEditor";
import { DEFAULT_VISUAL_VALUES, useVisualConfig } from "@features/visual-config-editor";
import { ThemeProvider } from "@code-proxy/ui";

function renderEditor(onChange = vi.fn()) {
  render(
    <ThemeProvider>
      <VisualConfigEditor
        values={{
          ...DEFAULT_VISUAL_VALUES,
          autoUpdateEnabled: true,
          autoUpdateChannel: "main",
          autoUpdateDockerImage: "ghcr.io/kittors/clirelay",
        }}
        onChange={onChange}
      />
    </ThemeProvider>,
  );
  return onChange;
}

describe("VisualConfigEditor auto update config", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  test("shows automatic update settings and exposes main/dev source branches", async () => {
    const onChange = renderEditor();

    const toggle = screen.getByRole("switch", { name: /automatic update checks/i });
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({ autoUpdateEnabled: false });

    const select = screen.getByRole("combobox", { name: /update source branch/i });
    await userEvent.click(select);
    expect(screen.queryByRole("option", { name: /auto-detect/i })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("option", { name: /development/i }));

    expect(onChange).toHaveBeenCalledWith({ autoUpdateChannel: "dev" });
  });

  test("exposes custom docker image repository with a risk warning", async () => {
    const onChange = renderEditor();

    const input = screen.getByRole("textbox", { name: /docker image repository/i });
    expect(input).toHaveValue("ghcr.io/kittors/clirelay");
    expect(screen.getByText(/custom images can break updates/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "registry.local/mirror/clirelay" } });

    expect(onChange).toHaveBeenLastCalledWith({
      autoUpdateDockerImage: "registry.local/mirror/clirelay",
    });
  });

  test("loads and writes auto-update settings in config yaml", async () => {
    const { result } = renderHook(() => useVisualConfig());

    act(() => {
      result.current.loadVisualValuesFromYaml(
        "auto-update:\n  enabled: false\n  channel: dev\n  docker-image: registry.local/mirror/clirelay\n",
      );
    });

    await waitFor(() => {
      expect(result.current.visualValues).toMatchObject({
        autoUpdateEnabled: false,
        autoUpdateChannel: "dev",
        autoUpdateDockerImage: "registry.local/mirror/clirelay",
      });
    });

    act(() => {
      result.current.setVisualValues({
        autoUpdateEnabled: true,
        autoUpdateChannel: "dev",
        autoUpdateDockerImage: "registry.example.com/team/clirelay",
      });
    });

    await waitFor(() => {
      expect(result.current.applyVisualChangesToYaml("")).toContain("auto-update:");
      expect(result.current.applyVisualChangesToYaml("")).toContain("enabled: true");
      expect(result.current.applyVisualChangesToYaml("")).toContain("channel: dev");
      expect(result.current.applyVisualChangesToYaml("")).toContain(
        "docker-image: registry.example.com/team/clirelay",
      );
    });
  });

  test("edits request archive settings with form controls", async () => {
    const onChange = renderEditor();

    await userEvent.click(screen.getByRole("switch", { name: /enable cold archive/i }));
    expect(onChange).toHaveBeenCalledWith({
      requestLogStorage: {
        ...DEFAULT_VISUAL_VALUES.requestLogStorage,
        archive: { ...DEFAULT_VISUAL_VALUES.requestLogStorage.archive, enabled: true },
      },
    });
    expect(screen.getByRole("textbox", { name: /excluded api key ids/i })).toBeInTheDocument();
  });

  test("loads and writes request archive settings in config yaml", async () => {
    const { result } = renderHook(() => useVisualConfig());

    act(() => {
      result.current.loadVisualValuesFromYaml(
        [
          "request-log-storage:",
          "  store-content: true",
          "  content-retention-days: 14",
          "  cleanup-interval-minutes: 30",
          "  max-total-size-mb: 4096",
          "  archive:",
          "    enabled: true",
          "    directory: /archives/requests",
          "    session-active-window-minutes: 90",
          "    low-watermark-ratio: 0.75",
          "    max-total-rows: 200000",
          "    pack-max-size-mb: 1024",
          "    pack-max-rows: 50000",
          "    excluded-api-key-ids:",
          "      - admin-key-id",
        ].join("\n"),
      );
    });

    await waitFor(() => {
      expect(result.current.visualValues.requestLogStorage).toMatchObject({
        storeContent: true,
        contentRetentionDays: "14",
        maxTotalSizeMb: "4096",
        archive: {
          enabled: true,
          directory: "/archives/requests",
          sessionActiveWindowMinutes: "90",
          excludedApiKeyIdsText: "admin-key-id",
        },
      });
    });

    act(() => {
      result.current.setVisualValues({
        requestLogStorage: {
          ...result.current.visualValues.requestLogStorage,
          archive: {
            ...result.current.visualValues.requestLogStorage.archive,
            excludedApiKeyIdsText: "admin-key-id\nops-key-id",
          },
        },
      });
    });

    await waitFor(() => {
      const nextYaml = result.current.applyVisualChangesToYaml("");
      expect(nextYaml).toContain("request-log-storage:");
      expect(nextYaml).toContain("store-content: true");
      expect(nextYaml).toContain("session-active-window-minutes: 90");
      expect(nextYaml).toContain("low-watermark-ratio: 0.75");
      expect(nextYaml).toContain("- admin-key-id");
      expect(nextYaml).toContain("- ops-key-id");
      expect(nextYaml).toContain("failure-policy: preserve-hot");
    });
  });

  test("exposes browser CORS origins as one origin per line", async () => {
    const onChange = renderEditor();

    const textarea = screen.getByRole("textbox", { name: /cors allowed origins/i });
    fireEvent.change(textarea, {
      target: {
        value: "chrome-extension://abcdefghijklmnop\nhttp://localhost:5173",
      },
    });

    expect(onChange).toHaveBeenLastCalledWith({
      corsAllowOriginsText: "chrome-extension://abcdefghijklmnop\nhttp://localhost:5173",
    });
  });

  test("loads and writes cors allow origins in config yaml", async () => {
    const { result } = renderHook(() => useVisualConfig());

    act(() => {
      result.current.loadVisualValuesFromYaml(
        [
          "cors-allow-origins:",
          "  - https://admin.example.com",
          "  - chrome-extension://abcdefghijklmnop",
        ].join("\n"),
      );
    });

    await waitFor(() => {
      expect(result.current.visualValues.corsAllowOriginsText).toBe(
        "https://admin.example.com\nchrome-extension://abcdefghijklmnop",
      );
    });

    act(() => {
      result.current.setVisualValues({
        corsAllowOriginsText:
          " https://plugin.example \n\nchrome-extension://abcdefghijklmnop\nhttps://plugin.example",
      });
    });

    await waitFor(() => {
      const nextYaml = result.current.applyVisualChangesToYaml("");
      expect(nextYaml).toContain("cors-allow-origins:");
      expect(nextYaml).toContain("- https://plugin.example");
      expect(nextYaml).toContain("- chrome-extension://abcdefghijklmnop");
      expect(nextYaml.match(/https:\/\/plugin\.example/g)).toHaveLength(1);
    });
  });

  test("loads and writes session-sticky routing strategy in config yaml", async () => {
    const { result } = renderHook(() => useVisualConfig());

    act(() => {
      result.current.loadVisualValuesFromYaml(
        [
          "routing:",
          "  strategy: session-sticky",
          "  channel-groups:",
          "    - name: sticky-pool",
          "      strategy: session-sticky",
          "      match:",
          "        channels:",
          "          - Main Codex",
        ].join("\n"),
      );
    });

    await waitFor(() => {
      expect(result.current.visualValues.routingStrategy).toBe("session-sticky");
      expect(result.current.visualValues.routingChannelGroups[0]?.strategy).toBe("session-sticky");
    });

    await waitFor(() => {
      const nextYaml = result.current.applyVisualChangesToYaml("");
      expect(nextYaml).toContain("strategy: session-sticky");
      expect(nextYaml).toContain("name: sticky-pool");
    });
  });

  test("loads payload rules from runtime config when YAML was cleaned after DB migration", async () => {
    const { result } = renderHook(() => useVisualConfig());

    act(() => {
      result.current.loadVisualValuesFromYaml("port: 8318\nlogging-to-file: true\n", {
        payload: {
          override: [
            {
              models: [{ name: "gpt-5.4", protocol: "codex" }],
              params: { service_tier: "priority" },
            },
          ],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.visualValues.payloadOverrideRules).toHaveLength(1);
      expect(result.current.visualValues.payloadOverrideRules[0]?.models[0]).toMatchObject({
        name: "gpt-5.4",
        protocol: "codex",
      });
      expect(result.current.visualValues.payloadOverrideRules[0]?.params[0]).toMatchObject({
        path: "service_tier",
        value: "priority",
      });
    });
  });

  test("writes empty payload marker when DB-backed payload rules are cleared visually", async () => {
    const { result } = renderHook(() => useVisualConfig());

    act(() => {
      result.current.loadVisualValuesFromYaml("port: 8318\n", {
        payload: {
          override: [
            {
              models: [{ name: "gpt-5.4", protocol: "codex" }],
              params: { service_tier: "priority" },
            },
          ],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.visualValues.payloadOverrideRules).toHaveLength(1);
    });

    act(() => {
      result.current.setVisualValues({ payloadOverrideRules: [] });
    });

    await waitFor(() => {
      const nextYaml = result.current.applyVisualChangesToYaml("port: 8318\n");
      expect(nextYaml).toContain("payload: {}\n");
      expect(nextYaml).not.toContain("service_tier");
    });
  });
});

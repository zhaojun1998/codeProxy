import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  usageApi,
  type AuthFileItem,
  type AuthFileWindowCostItem,
} from "@code-proxy/api-client";
import { useInterval } from "@code-proxy/ui";
import { normalizeAuthIndexValue } from "@code-proxy/domain";
import type { QuotaItem, QuotaState } from "@features/quota-preview/quota-helpers";

interface UseAuthFilesWindowCostOptions {
  tab: "files" | "excluded" | "alias";
  pageItems: AuthFileItem[];
  quotaByFileName: Record<string, QuotaState>;
}

type WindowCostByFileName = Record<string, Record<string, number>>;

interface FilePlan {
  fileName: string;
  authIndex: string;
  windows: { key: string; since: string }[];
}

const REFRESH_INTERVAL_MS = 30_000;

const resolveAuthIndex = (file: AuthFileItem): string | null => {
  const raw = (file as { auth_index?: unknown }).auth_index ?? file.authIndex;
  return normalizeAuthIndexValue(raw);
};

// The cost overlay keys each window the same way the card does, so the lookup in
// AuthFilesFilesTab (`item.key ?? item.label`) matches what we store here.
const windowKeyFor = (item: QuotaItem): string => item.key ?? item.label;

/**
 * useAuthFilesWindowCost fetches, per visible auth file, the request cost spent
 * since each quota window's start so the card can show "used $X · est. total $Y"
 * (estimated total = used ÷ utilisation). One POST covers the whole page; the
 * fetch only re-runs when the windows change, plus a slow interval to keep the
 * still-growing in-window cost fresh.
 */
export function useAuthFilesWindowCost({
  tab,
  pageItems,
  quotaByFileName,
}: UseAuthFilesWindowCostOptions): WindowCostByFileName {
  const [windowCostByFileName, setWindowCostByFileName] = useState<WindowCostByFileName>({});

  const plan = useMemo<FilePlan[]>(() => {
    const result: FilePlan[] = [];
    for (const file of pageItems) {
      const authIndex = resolveAuthIndex(file);
      if (!authIndex) continue;
      const items = quotaByFileName[file.name]?.items;
      if (!Array.isArray(items) || items.length === 0) continue;
      const windows: { key: string; since: string }[] = [];
      for (const item of items) {
        const resetAtMs = item.resetAtMs;
        const windowSeconds = item.windowSeconds;
        if (
          typeof resetAtMs !== "number" ||
          !Number.isFinite(resetAtMs) ||
          typeof windowSeconds !== "number" ||
          !Number.isFinite(windowSeconds) ||
          windowSeconds <= 0
        ) {
          continue;
        }
        const sinceMs = resetAtMs - windowSeconds * 1000;
        windows.push({ key: windowKeyFor(item), since: new Date(sinceMs).toISOString() });
      }
      if (windows.length > 0) {
        result.push({ fileName: file.name, authIndex, windows });
      }
    }
    return result;
  }, [pageItems, quotaByFileName]);

  const planRef = useRef<FilePlan[]>(plan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  // Stable signature so the fetch only re-runs when the windows actually change,
  // not on every percent tick from quota auto-refresh.
  const signature = useMemo(
    () =>
      JSON.stringify(
        plan
          .map(
            (p) =>
              `${p.fileName}|${p.authIndex}|${p.windows
                .map((w) => `${w.key}@${w.since}`)
                .sort()
                .join(",")}`,
          )
          .sort(),
      ),
    [plan],
  );

  const fetchWindowCosts = useCallback(async () => {
    const current = planRef.current;
    if (tab !== "files" || current.length === 0) return;
    const items: AuthFileWindowCostItem[] = current.map((p) => ({
      auth_index: p.authIndex,
      windows: p.windows,
    }));
    try {
      const costs = await usageApi.getAuthFileWindowCost(items);
      const next: WindowCostByFileName = {};
      for (const p of current) {
        const byKey = costs[p.authIndex];
        if (byKey) next[p.fileName] = byKey;
      }
      setWindowCostByFileName(next);
    } catch {
      // Best-effort overlay: ignore failures so the page is unaffected.
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "files") {
      setWindowCostByFileName({});
      return;
    }
    void fetchWindowCosts();
  }, [signature, fetchWindowCosts, tab]);

  useInterval(
    () => {
      void fetchWindowCosts();
    },
    tab === "files" ? REFRESH_INTERVAL_MS : null,
  );

  return windowCostByFileName;
}

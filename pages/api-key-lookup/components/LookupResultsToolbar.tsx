import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { HoverTooltip, Tabs, TabsList, TabsTrigger } from "@code-proxy/ui";
import { TimeRangeSelector } from "@features/monitor-widgets";
import type { TimeRange } from "@features/monitor-widgets/monitor-constants";

export type ApiKeyLookupTab = "usage" | "logs" | "models" | "quickImport";

/** sticky top-3 = 0.75rem，与 IntersectionObserver rootMargin 对齐 */
const STICKY_TOP_OFFSET_PX = 12;

export function LookupResultsToolbar({
  t,
  activeTab,
  setActiveTab,
  timeRange,
  setTimeRange,
  handleRefresh,
  loading,
  chartLoading,
  modelsLoading,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  activeTab: ApiKeyLookupTab;
  setActiveTab: (value: ApiKeyLookupTab) => void;
  timeRange: TimeRange;
  setTimeRange: (value: TimeRange) => void;
  handleRefresh: () => void;
  loading: boolean;
  chartLoading: boolean;
  modelsLoading: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // sentinel 滚过 sticky 偏移后 toolbar 真正吸顶，再淡入 border / 阴影，避免未吸顶时多一层框。
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setStuck(!entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: `-${STICKY_TOP_OFFSET_PX}px 0px 0px 0px`,
        threshold: 0,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    // 单层包裹，避免 main 的 space-y 把 sentinel 与 sticky 拆开。
    <div className="relative">
      <div
        ref={sentinelRef}
        className="pointer-events-none absolute inset-x-0 -top-px h-px"
        aria-hidden="true"
        data-testid="apikey-lookup-toolbar-sentinel"
      />
      {/* sticky 与窗口顶留 12px；吸顶后出现边框。不要在祖先加 overflow-x-hidden。 */}
      <div
        data-testid="apikey-lookup-toolbar-sticky"
        data-stuck={stuck ? "true" : "false"}
        className={[
          "sticky top-3 z-20 -mx-1 rounded-2xl px-1.5 py-1.5 backdrop-blur-md",
          "motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
          stuck
            ? "border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-neutral-950/85 dark:shadow-black/25"
            : "border border-transparent bg-white/80 dark:bg-neutral-950/70",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            >
              <TabsList>
                <TabsTrigger value="usage">{t("apikey_lookup.usage_stats")}</TabsTrigger>
                <TabsTrigger value="logs">{t("apikey_lookup.request_logs")}</TabsTrigger>
                <TabsTrigger value="models">{t("apikey_lookup.available_models")}</TabsTrigger>
                <TabsTrigger value="quickImport">{t("apikey_lookup.quick_import")}</TabsTrigger>
              </TabsList>
            </Tabs>
            {activeTab === "usage" || activeTab === "logs" ? (
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <HoverTooltip content={t("common.refresh")}>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || chartLoading || modelsLoading}
                aria-label={t("common.refresh")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <RefreshCw
                  size={16}
                  className={loading || chartLoading || modelsLoading ? "animate-spin" : ""}
                />
              </button>
            </HoverTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

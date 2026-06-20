import { useState, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  HOUR_WINDOWS,
  TIME_RANGES,
  type HourWindow,
  type TimeRange,
} from "@features/monitor-widgets/monitor-constants";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  CustomRangeFields,
  type CustomRange,
} from "@code-proxy/ui";

export const KpiCard = ({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: ReactNode;
  hint: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}) => {
  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
        <Icon size={14} className="text-slate-900 dark:text-white" />
        <span>{title}</span>
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-600 dark:text-white/65">{hint}</p>
    </article>
  );
};

export const TimeRangeSelector = ({
  value,
  onChange,
  customRange = null,
  onCustomApply,
  onClearCustom,
}: {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
  customRange?: CustomRange | null;
  onCustomApply?: (range: CustomRange) => void;
  onClearCustom?: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const [showCustom, setShowCustom] = useState(customRange != null);

  const handleTabChange = (next: string) => {
    if (next === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onClearCustom?.();
    onChange(Number(next) as TimeRange);
  };

  return (
    <div className="flex flex-col gap-2">
      <Tabs
        value={onCustomApply && showCustom ? "custom" : String(value)}
        onValueChange={handleTabChange}
      >
        <TabsList>
          {TIME_RANGES.map((range) => {
            const label = range === 1 ? t("monitor.today") : t("monitor.n_days", { count: range });
            return (
              <TabsTrigger key={range} value={String(range)}>
                {label}
              </TabsTrigger>
            );
          })}
          {onCustomApply ? (
            <TabsTrigger value="custom">{t("monitor.time.custom")}</TabsTrigger>
          ) : null}
        </TabsList>
      </Tabs>
      {onCustomApply && showCustom ? (
        <CustomRangeFields
          value={customRange}
          onApply={onCustomApply}
          locale={i18n.language}
          labels={{
            start: t("monitor.time.start"),
            end: t("monitor.time.end"),
            to: t("monitor.time.to"),
            apply: t("monitor.time.apply"),
            invalidRange: t("monitor.time.invalid_range"),
            picker: {
              picker: t("common.date_picker.picker"),
              open: t("common.date_picker.open"),
              previousMonth: t("common.date_picker.previous_month"),
              nextMonth: t("common.date_picker.next_month"),
              today: t("common.date_picker.today"),
              clear: t("common.date_picker.clear"),
              hour: t("common.date_picker.hour"),
              minute: t("common.date_picker.minute"),
            },
          }}
        />
      ) : null}
    </div>
  );
};

export const HourWindowSelector = ({
  value,
  onChange,
}: {
  value: HourWindow;
  onChange: (next: HourWindow) => void;
}) => {
  const { t } = useTranslation();
  return (
    <Tabs value={String(value)} onValueChange={(next) => onChange(Number(next) as HourWindow)}>
      <TabsList>
        {HOUR_WINDOWS.map((range) => (
          <TabsTrigger key={range} value={String(range)}>
            {t("monitor.last_nh", { count: range })}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export const MonitorCard = ({
  title,
  description,
  actions,
  loading = false,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <section
      className="min-w-0 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="text-xs text-slate-600 dark:text-white/65">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="relative mt-4 min-w-0">
        {children}
        {loading ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/65 backdrop-blur-sm dark:bg-neutral-950/45">
            <div
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-white/80"
            >
              <span
                className="h-4 w-4 rounded-full border-2 border-slate-300/80 border-t-slate-900 motion-reduce:animate-none motion-safe:animate-spin dark:border-white/20 dark:border-t-white/85"
                aria-hidden="true"
              />
              <span className="tabular-nums">{t("common.loading")}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

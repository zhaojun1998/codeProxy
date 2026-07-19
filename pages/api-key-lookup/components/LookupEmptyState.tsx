import { Activity, BarChart3, KeyRound, Layers } from "lucide-react";
import { Button } from "@code-proxy/ui";

export function LookupEmptyState({
  t,
  onLogin,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  onLogin: () => void;
}) {
  const stats = [
    {
      value: t("apikey_lookup.landing_stat_usage_value", { defaultValue: "用量" }),
      label: t("apikey_lookup.landing_stat_usage_label", {
        defaultValue: "请求 · Token · 费用",
      }),
    },
    {
      value: t("apikey_lookup.landing_stat_logs_value", { defaultValue: "日志" }),
      label: t("apikey_lookup.landing_stat_logs_label", {
        defaultValue: "请求回放与排错",
      }),
    },
    {
      value: t("apikey_lookup.landing_stat_models_value", { defaultValue: "模型" }),
      label: t("apikey_lookup.landing_stat_models_label", {
        defaultValue: "可用模型一览",
      }),
    },
  ] as const;

  const features = [
    {
      icon: BarChart3,
      title: t("apikey_lookup.landing_feature_usage_title", {
        defaultValue: "用量看板",
      }),
      desc: t("apikey_lookup.landing_feature_usage_desc", {
        defaultValue: "热力图、模型分布与每日趋势，一眼看清消耗。",
      }),
    },
    {
      icon: Activity,
      title: t("apikey_lookup.landing_feature_logs_title", {
        defaultValue: "请求日志",
      }),
      desc: t("apikey_lookup.landing_feature_logs_desc", {
        defaultValue: "按模型与状态筛选，快速定位失败与延迟。",
      }),
    },
    {
      icon: Layers,
      title: t("apikey_lookup.landing_feature_models_title", {
        defaultValue: "模型广场",
      }),
      desc: t("apikey_lookup.landing_feature_models_desc", {
        defaultValue: "当前密钥可用的模型列表，支持搜索复制。",
      }),
    },
  ] as const;

  return (
    <section
      data-testid="apikey-lookup-landing"
      className="relative isolate overflow-hidden rounded-4xl border border-slate-200/70 bg-white/55 px-5 py-14 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-white/[0.08] dark:bg-white/[0.02] dark:shadow-none sm:px-10 sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.45) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 35%, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 35%, black 20%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-400/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-violet-200/45 blur-3xl dark:bg-violet-400/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-[28rem] -translate-x-1/2 rounded-full bg-sky-100/50 blur-3xl dark:bg-sky-400/5"
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {t("apikey_lookup.landing_badge", {
            defaultValue: "自助门户 · 用量与日志",
          })}
        </div>

        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl sm:leading-[1.1]">
          <span className="block sm:inline">
            {t("apikey_lookup.landing_title_prefix", { defaultValue: "一个入口，" })}
          </span>
          <span className="bg-gradient-to-r from-orange-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
            {t("apikey_lookup.landing_title_accent", {
              defaultValue: "查看用量与模型",
            })}
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-sm leading-relaxed text-slate-500 dark:text-white/55 sm:text-base">
          {t("apikey_lookup.landing_desc", {
            defaultValue:
              "登录账号后即可查看密钥用量、请求日志、模型广场，并管理你的 API Key。",
          })}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={onLogin}
            className="h-11 rounded-full px-6 text-sm font-semibold shadow-sm active:scale-[0.98]"
          >
            <KeyRound size={16} aria-hidden />
            {t("apikey_lookup.landing_cta", { defaultValue: "登录查看" })}
          </Button>
        </div>

        <dl className="mt-14 grid w-full max-w-lg grid-cols-3 gap-2 sm:gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="px-1 py-2">
              <dt className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {stat.value}
              </dt>
              <dd className="mt-1 text-2xs leading-snug text-slate-500 dark:text-white/45 sm:text-xs">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative mx-auto mt-14 grid max-w-4xl gap-3 sm:grid-cols-3 sm:gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 text-left shadow-sm backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-neutral-950">
                <Icon size={16} strokeWidth={1.75} aria-hidden />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-white/50">
                {feature.desc}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

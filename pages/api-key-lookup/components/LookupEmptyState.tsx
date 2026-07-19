import { ArrowRight, BarChart3, KeyRound, ScrollText, Store } from "lucide-react";
import { ClaudeLogo, GeminiLogo, OpenAILogo, VertexLogo } from "@code-proxy/assets";
import { Button } from "@code-proxy/ui";

export function LookupEmptyState({
  t,
  onLogin,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  onLogin: () => void;
}) {
  const features = [
    {
      icon: BarChart3,
      title: t("apikey_lookup.landing_feature_usage_title", {
        defaultValue: "用量脉络",
      }),
      desc: t("apikey_lookup.landing_feature_usage_desc", {
        defaultValue: "按请求、Token 与费用查看趋势，快速理解每一段调用消耗。",
      }),
    },
    {
      icon: ScrollText,
      title: t("apikey_lookup.landing_feature_logs_title", {
        defaultValue: "请求轨迹",
      }),
      desc: t("apikey_lookup.landing_feature_logs_desc", {
        defaultValue: "从模型、状态到输入输出，保留可筛选、可回看的请求上下文。",
      }),
    },
    {
      icon: Store,
      title: t("apikey_lookup.landing_feature_models_title", {
        defaultValue: "模型目录",
      }),
      desc: t("apikey_lookup.landing_feature_models_desc", {
        defaultValue: "集中浏览当前可用模型与价格，找到适合下一次调用的选择。",
      }),
    },
  ] as const;

  const providers = [
    { name: "OpenAI", Logo: OpenAILogo },
    { name: "Gemini", Logo: GeminiLogo },
    { name: "Claude", Logo: ClaudeLogo },
    { name: "Vertex AI", Logo: VertexLogo },
  ] as const;

  return (
    <div data-testid="apikey-lookup-landing" className="w-full">
      <section className="border-b border-slate-200/70 dark:border-white/[0.08]">
        <div className="mx-auto flex min-h-[calc(78dvh-3.5rem)] w-full max-w-screen-xl items-center px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.14em] text-slate-500 dark:text-white/45">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/65 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65">
                <KeyRound size={15} strokeWidth={1.7} aria-hidden />
              </span>
              CODE PROXY
            </div>

            <h1 className="mt-8 max-w-4xl break-keep text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {t("apikey_lookup.landing_title", {
                defaultValue: "让每一次模型调用，都清晰可见",
              })}
            </h1>

            <p className="mt-6 max-w-2xl text-pretty text-base leading-8 text-slate-600 dark:text-white/60">
              {t("apikey_lookup.landing_desc", {
                defaultValue:
                  "Code Proxy 把多家 AI 模型接入、API Key 管理、用量趋势与请求日志放在同一个工作台。登录后，直接进入属于你的控制台。",
              })}
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="default"
                onClick={onLogin}
                className="h-10 border border-slate-200 bg-white/80 px-4 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.11]"
              >
                {t("apikey_lookup.landing_cta", { defaultValue: "进入 Code Proxy" })}
                <ArrowRight size={15} strokeWidth={1.8} aria-hidden />
              </Button>
              <p className="text-xs leading-5 text-slate-500 dark:text-white/40">
                {t("apikey_lookup.landing_cta_note", {
                  defaultValue: "一个账号，管理密钥、用量、日志与模型。",
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-screen-xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:px-10 lg:py-28">
        <div className="self-start lg:sticky lg:top-24">
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 dark:text-white/40">
            {t("apikey_lookup.landing_capabilities_eyebrow", {
              defaultValue: "从接入到排查",
            })}
          </p>
          <h2 className="mt-5 max-w-xl text-balance text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {t("apikey_lookup.landing_capabilities_title", {
              defaultValue: "不是一次查询，而是持续可见的调用全景",
            })}
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 dark:text-white/55 sm:text-base">
            {t("apikey_lookup.landing_capabilities_desc", {
              defaultValue:
                "从密钥到模型，从趋势到单次请求，Code Proxy 用同一套上下文帮助你理解消耗、定位问题并继续调用。",
            })}
          </p>
        </div>

        <ol className="border-t border-slate-200/80 dark:border-white/10">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="grid gap-4 border-b border-slate-200/80 py-8 dark:border-white/10 sm:grid-cols-[4rem_1fr] sm:gap-5 sm:py-9"
              >
                <div className="flex items-center gap-3 text-slate-400 dark:text-white/35 sm:items-start">
                  <span className="text-xs font-medium tabular-nums">0{index + 1}</span>
                  <Icon size={16} strokeWidth={1.6} aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-white/50 sm:text-base">
                    {feature.desc}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="border-y border-slate-200/70 dark:border-white/[0.08]">
        <div className="mx-auto w-full max-w-screen-xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 dark:text-white/40">
                {t("apikey_lookup.landing_providers_eyebrow", {
                  defaultValue: "广泛兼容",
                })}
              </p>
              <h2 className="mt-4 max-w-xl text-balance text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                {t("apikey_lookup.landing_providers_title", {
                  defaultValue: "连接你正在使用的主流模型平台",
                })}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-white/50 sm:text-base lg:justify-self-end">
              {t("apikey_lookup.landing_providers_desc", {
                defaultValue:
                  "在一个入口中查看不同模型平台的调用与用量，不必在分散的页面之间反复切换。",
              })}
            </p>
          </div>

          <ul className="mt-10 grid grid-cols-2 border-t border-slate-200/80 dark:border-white/10 lg:grid-cols-4">
            {providers.map(({ name, Logo }) => (
              <li
                key={name}
                className="flex items-center gap-3 border-b border-slate-200/80 py-5 text-slate-700 dark:border-white/10 dark:text-white/70"
              >
                <Logo size={20} />
                <span className="text-sm font-medium tracking-tight">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="mx-auto flex w-full max-w-screen-xl flex-col items-start justify-between gap-7 px-5 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:px-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-slate-500 dark:text-white/40">
              <KeyRound size={14} strokeWidth={1.7} aria-hidden />
              CODE PROXY
            </div>
            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              {t("apikey_lookup.landing_final_title", {
                defaultValue: "准备好查看你的调用全景了吗？",
              })}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-white/50 sm:text-base">
              {t("apikey_lookup.landing_final_desc", {
                defaultValue: "登录 Code Proxy，进入现有用户控制台。",
              })}
            </p>
          </div>
          <Button
            type="button"
            variant="default"
            onClick={onLogin}
            className="h-10 shrink-0 border border-slate-200 bg-white/80 px-4 text-slate-800 hover:bg-white dark:border-white/10 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.11]"
          >
            {t("apikey_lookup.landing_final_cta", {
              defaultValue: "登录并进入控制台",
            })}
            <ArrowRight size={15} strokeWidth={1.8} aria-hidden />
          </Button>
        </div>
      </section>
    </div>
  );
}

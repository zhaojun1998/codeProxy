import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type {
  PromptFilterAction,
  PromptFilterMatch,
  PromptFilterMode,
} from "@code-proxy/api-client";

// 后端在命中片段两侧插入的标记，前端据此把命中文字渲染为高亮。
export const HIT_START = "⟦PF_HIT⟧";
export const HIT_END = "⟦/PF_HIT⟧";

// 与库内 TextInput(controlSurface) 视觉一致的多行文本域样式，供敏感词/测试文本/自定义规则复用。
export const PROMPT_FILTER_TEXTAREA_CLASS =
  "w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400/35 dark:border-neutral-800 dark:bg-neutral-950 dark:text-slate-100 dark:placeholder:text-neutral-500 dark:focus-visible:ring-white/15";

const BADGE_BASE =
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const BADGE_TONE = {
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300",
  slate:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-white/70",
} as const;

const ACTION_TONE: Record<PromptFilterAction, keyof typeof BADGE_TONE> = {
  allow: "emerald",
  warn: "amber",
  block: "rose",
};

const MODE_TONE: Record<PromptFilterMode, keyof typeof BADGE_TONE> = {
  monitor: "blue",
  warn: "amber",
  block: "rose",
};

/** 拦截动作徽章：allow(绿)/warn(琥珀)/block(红)。 */
export function ActionBadge({ action }: { action: string }) {
  const { t } = useTranslation();
  const key = (action in ACTION_TONE ? action : "allow") as PromptFilterAction;
  return (
    <span className={`${BADGE_BASE} ${BADGE_TONE[ACTION_TONE[key]]}`}>
      {t(`prompt_filter.action_${key}`)}
    </span>
  );
}

/** 运行模式徽章：monitor(仅记录)/warn(告警放行)/block(拦截)。 */
export function ModeBadge({ mode }: { mode: string }) {
  const { t } = useTranslation();
  const key = (mode in MODE_TONE ? mode : "monitor") as PromptFilterMode;
  return (
    <span className={`${BADGE_BASE} ${BADGE_TONE[MODE_TONE[key]]}`}>
      {t(`prompt_filter.mode_${key}`)}
    </span>
  );
}

/**
 * 把包含 ⟦PF_HIT⟧…⟦/PF_HIT⟧ 标记的预览文本渲染为节点数组，命中片段用高亮包裹，
 * 其余文本原样输出。标记未闭合时把尾部剩余文本也视为命中，避免丢字符。
 */
export function renderPromptFilterHighlight(text: string): ReactNode {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;

  while (rest.length > 0) {
    const start = rest.indexOf(HIT_START);
    if (start === -1) {
      nodes.push(<Fragment key={index++}>{rest}</Fragment>);
      break;
    }
    if (start > 0) {
      nodes.push(<Fragment key={index++}>{rest.slice(0, start)}</Fragment>);
    }
    const afterStart = rest.slice(start + HIT_START.length);
    const end = afterStart.indexOf(HIT_END);
    const hit = end === -1 ? afterStart : afterStart.slice(0, end);
    nodes.push(
      <span
        key={index++}
        className="rounded bg-rose-100 px-0.5 font-medium text-rose-700 dark:bg-rose-500/25 dark:text-rose-200"
      >
        {hit}
      </span>,
    );
    if (end === -1) break;
    rest = afterStart.slice(end + HIT_END.length);
  }

  return nodes;
}

/** 解析日志里的 matched_patterns（JSON 字符串）为规则数组，解析失败返回空数组。 */
export function parseMatchedPatterns(raw: string): PromptFilterMatch[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PromptFilterMatch[]) : [];
  } catch {
    return [];
  }
}

/** 本地化时间戳，无法解析时原样返回。 */
export function formatPromptFilterTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

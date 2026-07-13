import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, FlaskConical, Minus, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  promptFilterApi,
  type PromptFilterConfig,
  type PromptFilterPatternConfig,
  type PromptFilterRule,
  type PromptFilterRulesResponse,
} from "@code-proxy/api-client";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Modal,
  TextInput,
  ToggleSwitch,
  useToast,
  type DataTableColumn,
} from "@code-proxy/ui";
import { PROMPT_FILTER_TEXTAREA_CLASS } from "../promptFilterShared";

interface RulesPanelProps {
  config: PromptFilterConfig;
  rules: PromptFilterRulesResponse;
  onSaved: () => void;
}

interface CustomForm {
  name: string;
  pattern: string;
  weight: string;
  category: string;
  strict: boolean;
  enabled: boolean;
}

const emptyCustomForm: CustomForm = {
  name: "",
  pattern: "",
  weight: "1",
  category: "",
  strict: false,
  enabled: true,
};

const toCustomForm = (rule: PromptFilterPatternConfig): CustomForm => ({
  name: rule.name,
  pattern: rule.pattern,
  weight: String(rule.weight),
  category: rule.category ?? "",
  strict: rule.strict ?? false,
  enabled: rule.enabled ?? true,
});

function BoolMark({ value }: { value: boolean }) {
  return value ? (
    <Check size={15} className="text-amber-500" aria-hidden="true" />
  ) : (
    <Minus size={15} className="text-slate-300 dark:text-white/25" aria-hidden="true" />
  );
}

export function RulesPanel({ config, rules, onSaved }: RulesPanelProps) {
  const { t } = useTranslation();
  const { notify } = useToast();

  const [disabledSet, setDisabledSet] = useState<Set<string>>(
    () => new Set(config.disabled_patterns),
  );
  const [customList, setCustomList] = useState<PromptFilterPatternConfig[]>(config.custom_patterns);
  const [saving, setSaving] = useState(false);

  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [customForm, setCustomForm] = useState<CustomForm>(emptyCustomForm);

  const [testPattern, setTestPattern] = useState("");
  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ matched: boolean; error?: string } | null>(null);

  useEffect(() => {
    setDisabledSet(new Set(config.disabled_patterns));
    setCustomList(config.custom_patterns);
  }, [config]);

  const dirty = useMemo(() => {
    const nextDisabled = [...disabledSet].sort().join("\u0000");
    const baseDisabled = [...config.disabled_patterns].sort().join("\u0000");
    return (
      nextDisabled !== baseDisabled ||
      JSON.stringify(customList) !== JSON.stringify(config.custom_patterns)
    );
  }, [disabledSet, customList, config]);

  const toggleBuiltin = useCallback((name: string, enabled: boolean) => {
    setDisabledSet((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      const next: PromptFilterConfig = {
        ...config,
        disabled_patterns: [...disabledSet],
        custom_patterns: customList,
      };
      await promptFilterApi.updateConfig(next);
      notify({ type: "success", message: t("prompt_filter.rules_saved") });
      onSaved();
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("prompt_filter.rules_save_failed"),
      });
    } finally {
      setSaving(false);
    }
  }, [config, customList, disabledSet, notify, onSaved, t]);

  const resetLocal = useCallback(() => {
    setDisabledSet(new Set(config.disabled_patterns));
    setCustomList(config.custom_patterns);
  }, [config]);

  const openCreate = useCallback(() => {
    setEditingIndex(null);
    setCustomForm(emptyCustomForm);
    setCustomModalOpen(true);
  }, []);

  const openEdit = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setCustomForm(toCustomForm(customList[index]));
      setCustomModalOpen(true);
    },
    [customList],
  );

  const submitCustom = useCallback(() => {
    const name = customForm.name.trim();
    const pattern = customForm.pattern.trim();
    if (!name || !pattern) {
      notify({ type: "error", message: t("prompt_filter.rule_name_pattern_required") });
      return;
    }
    const weight = Number(customForm.weight.trim());
    if (!Number.isFinite(weight)) {
      notify({ type: "error", message: t("prompt_filter.number_invalid") });
      return;
    }
    const rule: PromptFilterPatternConfig = {
      name,
      pattern,
      weight,
      category: customForm.category.trim() || undefined,
      strict: customForm.strict,
      enabled: customForm.enabled,
    };
    setCustomList((prev) => {
      if (editingIndex === null) return [...prev, rule];
      const next = [...prev];
      next[editingIndex] = rule;
      return next;
    });
    setCustomModalOpen(false);
  }, [customForm, editingIndex, notify, t]);

  const deleteCustom = useCallback((index: number) => {
    setCustomList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRuleTest = useCallback(async () => {
    const pattern = testPattern.trim();
    if (!pattern) {
      notify({ type: "error", message: t("prompt_filter.rule_pattern_required") });
      return;
    }
    setTesting(true);
    try {
      const res = await promptFilterApi.testRule(pattern, testInput);
      setTestResult(res);
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("prompt_filter.test_failed"),
      });
    } finally {
      setTesting(false);
    }
  }, [notify, t, testInput, testPattern]);

  const builtinColumns = useMemo<DataTableColumn<PromptFilterRule>[]>(
    () => [
      {
        key: "name",
        label: t("prompt_filter.rule_name"),
        width: "w-[220px] min-w-[220px]",
        cellClassName: "font-medium text-slate-800 dark:text-white/85",
        render: (row) => (
          <span className="block truncate" title={row.name}>
            {row.name}
          </span>
        ),
      },
      {
        key: "pattern",
        label: t("prompt_filter.rule_pattern"),
        width: "w-[300px] min-w-[300px]",
        cellClassName: "truncate font-mono text-xs text-slate-500 dark:text-white/50",
        render: (row) => (
          <span className="block truncate" title={row.pattern}>
            {row.pattern}
          </span>
        ),
      },
      {
        key: "category",
        label: t("prompt_filter.rule_category"),
        width: "w-[140px] min-w-[140px]",
        cellClassName: "truncate text-slate-600 dark:text-white/60",
        render: (row) => row.category || "-",
      },
      {
        key: "weight",
        label: t("prompt_filter.rule_weight"),
        width: "w-[90px] min-w-[90px]",
        cellClassName: "font-mono tabular-nums text-slate-600 dark:text-white/60",
        render: (row) => row.weight,
      },
      {
        key: "strict",
        label: t("prompt_filter.rule_strict"),
        width: "w-[80px] min-w-[80px]",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <span className="inline-flex justify-center">
            <BoolMark value={Boolean(row.strict)} />
          </span>
        ),
      },
      {
        key: "enabled",
        label: t("prompt_filter.rule_enabled"),
        width: "w-[88px] min-w-[88px]",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <span className="inline-flex justify-center">
            <ToggleSwitch
              checked={!disabledSet.has(row.name)}
              onCheckedChange={(next) => toggleBuiltin(row.name, next)}
              ariaLabel={row.name}
            />
          </span>
        ),
      },
    ],
    [disabledSet, t, toggleBuiltin],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
        <p className="text-sm text-slate-600 dark:text-white/65">
          {dirty ? t("prompt_filter.rules_dirty_hint") : t("prompt_filter.rules_clean_hint")}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetLocal} disabled={saving || !dirty}>
            <RotateCcw size={14} />
            {t("prompt_filter.rules_reset")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void persist()}
            disabled={saving || !dirty}
          >
            <Save size={14} />
            {t("prompt_filter.rules_save")}
          </Button>
        </div>
      </div>

      <Card
        title={t("prompt_filter.builtin_title")}
        description={t("prompt_filter.builtin_desc", { count: rules.builtin_patterns.length })}
      >
        <div className="h-[440px]">
          <DataTable
            tableId="prompt-filter-builtin"
            rows={rules.builtin_patterns}
            columns={builtinColumns}
            rowKey={(row) => row.name}
            virtualize={false}
            minWidth="min-w-[920px]"
            height="h-full"
            minHeight="min-h-full"
            caption={t("prompt_filter.builtin_title")}
            emptyText={t("prompt_filter.builtin_empty")}
            showAllLoadedMessage={false}
          />
        </div>
      </Card>

      <Card
        title={t("prompt_filter.custom_title")}
        description={t("prompt_filter.custom_desc")}
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={14} />
            {t("prompt_filter.custom_add")}
          </Button>
        }
      >
        {customList.length === 0 ? (
          <EmptyState
            title={t("prompt_filter.custom_empty")}
            description={t("prompt_filter.custom_empty_desc")}
          />
        ) : (
          <div className="space-y-2">
            {customList.map((rule, index) => (
              <div
                key={`${rule.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {rule.name}
                    </span>
                    {rule.strict ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                        {t("prompt_filter.rule_strict")}
                      </span>
                    ) : null}
                    {rule.enabled === false ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-white/60">
                        {t("prompt_filter.rule_disabled")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-white/50">
                    {rule.pattern}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400 dark:text-white/40">
                    {t("prompt_filter.rule_weight")}: {rule.weight}
                    {rule.category ? ` · ${rule.category}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(index)}
                    aria-label={t("common.edit")}
                    title={t("common.edit")}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-amber-600 dark:text-white/50 dark:hover:bg-neutral-800 dark:hover:text-amber-400"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCustom(index)}
                    aria-label={t("common.delete")}
                    title={t("common.delete")}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title={t("prompt_filter.rule_test_title")}
        description={t("prompt_filter.rule_test_desc")}
      >
        <div className="space-y-3">
          <TextInput
            value={testPattern}
            onChange={(e) => setTestPattern(e.currentTarget.value)}
            placeholder={t("prompt_filter.rule_test_pattern_placeholder")}
            aria-label={t("prompt_filter.rule_pattern")}
            className="font-mono"
          />
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.currentTarget.value)}
            placeholder={t("prompt_filter.rule_test_text_placeholder")}
            aria-label={t("prompt_filter.rule_test_text_placeholder")}
            className={`${PROMPT_FILTER_TEXTAREA_CLASS} min-h-[100px]`}
          />
          <div className="flex items-center justify-between gap-3">
            <div>
              {testResult ? (
                testResult.error ? (
                  <span className="text-sm text-rose-600 dark:text-rose-300">
                    {testResult.error}
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium ${
                      testResult.matched
                        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                    }`}
                  >
                    {testResult.matched
                      ? t("prompt_filter.rule_test_matched")
                      : t("prompt_filter.rule_test_not_matched")}
                  </span>
                )
              ) : null}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleRuleTest()}
              disabled={testing || !testPattern.trim()}
            >
              <FlaskConical size={14} />
              {t("prompt_filter.rule_test_run")}
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={customModalOpen}
        title={
          editingIndex === null ? t("prompt_filter.custom_add") : t("prompt_filter.custom_edit")
        }
        maxWidth="max-w-lg"
        onClose={() => setCustomModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCustomModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={submitCustom}>
              {t("prompt_filter.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-900 dark:text-white">
              {t("prompt_filter.rule_name")}
            </span>
            <TextInput
              value={customForm.name}
              onChange={(e) => setCustomForm((prev) => ({ ...prev, name: e.currentTarget.value }))}
              aria-label={t("prompt_filter.rule_name")}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-900 dark:text-white">
              {t("prompt_filter.rule_pattern")}
            </span>
            <TextInput
              value={customForm.pattern}
              onChange={(e) =>
                setCustomForm((prev) => ({ ...prev, pattern: e.currentTarget.value }))
              }
              placeholder={t("prompt_filter.rule_pattern_placeholder")}
              aria-label={t("prompt_filter.rule_pattern")}
              className="font-mono"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-slate-900 dark:text-white">
                {t("prompt_filter.rule_weight")}
              </span>
              <TextInput
                value={customForm.weight}
                onChange={(e) =>
                  setCustomForm((prev) => ({ ...prev, weight: e.currentTarget.value }))
                }
                inputMode="decimal"
                aria-label={t("prompt_filter.rule_weight")}
              />
            </div>
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-slate-900 dark:text-white">
                {t("prompt_filter.rule_category")}
              </span>
              <TextInput
                value={customForm.category}
                onChange={(e) =>
                  setCustomForm((prev) => ({ ...prev, category: e.currentTarget.value }))
                }
                aria-label={t("prompt_filter.rule_category")}
              />
            </div>
          </div>
          <ToggleSwitch
            label={t("prompt_filter.rule_strict")}
            description={t("prompt_filter.rule_strict_desc")}
            checked={customForm.strict}
            onCheckedChange={(next) => setCustomForm((prev) => ({ ...prev, strict: next }))}
          />
          <ToggleSwitch
            label={t("prompt_filter.rule_enabled")}
            description={t("prompt_filter.rule_enabled_desc")}
            checked={customForm.enabled}
            onCheckedChange={(next) => setCustomForm((prev) => ({ ...prev, enabled: next }))}
          />
        </div>
      </Modal>
    </div>
  );
}

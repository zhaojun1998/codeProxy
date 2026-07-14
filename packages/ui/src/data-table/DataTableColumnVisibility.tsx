import { useCallback, useEffect, useMemo, useState } from "react";
import { Columns3, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "../primitives/Checkbox";
import { DropdownMenu } from "../primitives/DropdownMenu";
import type { DataTableColumn } from "./DataTable.types";

const COLUMN_VISIBILITY_STORAGE_PREFIX = "codeProxy.dataTable.visibleColumns.v1";

function storageKey(tableId: string) {
  return `${COLUMN_VISIBILITY_STORAGE_PREFIX}.${tableId.trim()}`;
}

function normalizeVisibleKeys<T>(columns: DataTableColumn<T>[], keys: string[]) {
  const validKeys = new Set(columns.map((column) => column.key));
  const normalized = Array.from(new Set(keys.filter((key) => validKeys.has(key))));
  return normalized.length > 0 ? normalized : columns.map((column) => column.key);
}

function readVisibleKeys<T>(tableId: string, columns: DataTableColumn<T>[]) {
  if (typeof window === "undefined") return columns.map((column) => column.key);
  try {
    const raw = window.localStorage.getItem(storageKey(tableId));
    if (!raw) return columns.map((column) => column.key);
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? normalizeVisibleKeys(
          columns,
          parsed.filter((value): value is string => typeof value === "string"),
        )
      : columns.map((column) => column.key);
  } catch {
    return columns.map((column) => column.key);
  }
}

function writeVisibleKeys(tableId: string, keys: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(tableId), JSON.stringify(keys));
  } catch {
    // localStorage 在隐私模式或嵌入环境中可能不可用。
  }
}

export function useDataTableColumnVisibility<T>(tableId: string, columns: DataTableColumn<T>[]) {
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => readVisibleKeys(tableId, columns));

  useEffect(() => {
    setVisibleKeys((current) => normalizeVisibleKeys(columns, current));
  }, [columns]);

  const visibleColumns = useMemo(() => {
    const visible = new Set(visibleKeys);
    return columns.filter((column) => visible.has(column.key));
  }, [columns, visibleKeys]);

  const setColumnVisible = useCallback(
    (columnKey: string, visible: boolean) => {
      setVisibleKeys((current) => {
        const next = visible
          ? normalizeVisibleKeys(columns, [...current, columnKey])
          : current.filter((key) => key !== columnKey);
        if (next.length === 0) return current;
        writeVisibleKeys(tableId, next);
        return next;
      });
    },
    [columns, tableId],
  );

  const reset = useCallback(() => {
    const next = columns.map((column) => column.key);
    writeVisibleKeys(tableId, next);
    setVisibleKeys(next);
  }, [columns, tableId]);

  return { visibleColumns, visibleKeys, setColumnVisible, reset };
}

export function DataTableColumnVisibilityMenu<T>({
  columns,
  visibleKeys,
  onVisibilityChange,
  onReset,
}: {
  columns: DataTableColumn<T>[];
  visibleKeys: string[];
  onVisibilityChange: (columnKey: string, visible: boolean) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const visible = useMemo(() => new Set(visibleKeys), [visibleKeys]);

  return (
    <DropdownMenu.Root size="sm">
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t("common.select_table_columns")}
          title={t("common.select_table_columns")}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white/65 dark:hover:bg-neutral-900 dark:focus-visible:ring-white/15"
        >
          <Columns3 size={14} aria-hidden="true" />
          {t("common.table_columns")}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="max-h-80 min-w-52 overflow-y-auto">
          {columns.map((column) => {
            const checked = visible.has(column.key);
            const disableHide = checked && visible.size === 1;
            return (
              <DropdownMenu.Item
                key={column.key}
                disabled={disableHide}
                onSelect={(event) => {
                  event.preventDefault();
                  onVisibilityChange(column.key, !checked);
                }}
              >
                <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
                <span className="truncate">{column.label}</span>
              </DropdownMenu.Item>
            );
          })}
          <DropdownMenu.Separator />
          <DropdownMenu.Item onSelect={onReset}>
            <RotateCcw size={13} aria-hidden="true" />
            <span>{t("common.reset_table_columns")}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

import { useState } from "react";
import { DateTimePicker, type DateTimePickerLabels } from "./DateTimePicker";

export interface CustomRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface CustomRangeLabels {
  start: string;
  end: string;
  to: string;
  apply: string;
  invalidRange: string;
  picker: DateTimePickerLabels;
}

interface CustomRangeFieldsProps {
  value: CustomRange | null;
  onApply: (range: CustomRange) => void;
  labels: CustomRangeLabels;
  locale?: string;
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toDateValue = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const dateOnly = (value: string): string => value.slice(0, 10);

const defaultRange = (): CustomRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return { start: toDateValue(start), end: toDateValue(end) };
};

/**
 * CustomRangeFields lets the user pick an arbitrary [start, end] date range.
 * It is a presentational control: all copy is provided via `labels` so it can
 * be reused across pages without depending on i18n. Statistics are bucketed by
 * day, so only the date part of each value is emitted on apply.
 */
export function CustomRangeFields({ value, onApply, labels, locale }: CustomRangeFieldsProps) {
  const initial = value ?? defaultRange();
  // DateTimePicker works with "YYYY-MM-DDTHH:mm"; only the date part is used.
  const [start, setStart] = useState(`${initial.start}T00:00`);
  const [end, setEnd] = useState(`${initial.end}T00:00`);

  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  const invalid = !startDate || !endDate || startDate > endDate;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateTimePicker
        value={start}
        onChange={setStart}
        aria-label={labels.start}
        labels={labels.picker}
        locale={locale}
      />
      <span className="text-xs font-medium text-slate-500 dark:text-white/55">{labels.to}</span>
      <DateTimePicker
        value={end}
        onChange={setEnd}
        aria-label={labels.end}
        labels={labels.picker}
        locale={locale}
      />
      <button
        type="button"
        disabled={invalid}
        onClick={() => onApply({ start: startDate, end: endDate })}
        title={invalid ? labels.invalidRange : undefined}
        className="rounded-full bg-[#18181B] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-[#18181B] dark:hover:bg-white/90"
      >
        {labels.apply}
      </button>
    </div>
  );
}

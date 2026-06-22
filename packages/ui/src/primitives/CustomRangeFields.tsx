import { useState } from "react";
import { DateTimePicker, type DateTimePickerLabels } from "./DateTimePicker";

export interface CustomRange {
  start: string; // YYYY-MM-DDTHH:mm
  end: string; // YYYY-MM-DDTHH:mm
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

const toDateTimeValue = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
  `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

// Promote a legacy date-only value ("YYYY-MM-DD") to the datetime form the
// picker and backend expect; leave already-datetime values untouched.
const ensureDateTime = (value: string): string =>
  value.length === 10 ? `${value}T00:00` : value;

const defaultRange = (): CustomRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start: toDateTimeValue(start), end: toDateTimeValue(end) };
};

/**
 * CustomRangeFields lets the user pick an arbitrary [start, end] datetime range.
 * It is a presentational control: all copy is provided via `labels` so it can
 * be reused across pages without depending on i18n. The full "YYYY-MM-DDTHH:mm"
 * value (including the time of day) is emitted on apply so the backend can
 * honour minute-level ranges.
 */
export function CustomRangeFields({ value, onApply, labels, locale }: CustomRangeFieldsProps) {
  const initial = value ?? defaultRange();
  const [start, setStart] = useState(ensureDateTime(initial.start));
  const [end, setEnd] = useState(ensureDateTime(initial.end));

  // ISO "YYYY-MM-DDTHH:mm" strings sort identically as plain text, so a direct
  // comparison is enough to reject an empty or inverted range.
  const invalid = !start || !end || start >= end;

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
        onClick={() => onApply({ start, end })}
        title={invalid ? labels.invalidRange : undefined}
        className="rounded-full bg-[#18181B] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#27272A] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-[#18181B] dark:hover:bg-white/90"
      >
        {labels.apply}
      </button>
    </div>
  );
}

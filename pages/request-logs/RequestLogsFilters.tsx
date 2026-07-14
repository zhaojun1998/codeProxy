import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { SearchableCheckboxMultiSelect, Select, TextInput } from "@code-proxy/ui";
import type { SearchableCheckboxMultiSelectOption } from "@code-proxy/ui";
import { cn } from "@code-proxy/ui";
import {
  RequestLogFacetFilters,
  type MultiSelectFilterState,
  type StatusFilterValue,
} from "@features/request-log-viewer";

interface RequestLogsFiltersProps {
  keyOptions: SearchableCheckboxMultiSelectOption[];
  modelOptions: SearchableCheckboxMultiSelectOption[];
  channelOptions: SearchableCheckboxMultiSelectOption[];
  statusOptions: SearchableCheckboxMultiSelectOption[];
  selectedApiKeys: MultiSelectFilterState<string>;
  selectedModels: MultiSelectFilterState<string>;
  selectedChannels: MultiSelectFilterState<string>;
  selectedStatuses: MultiSelectFilterState<StatusFilterValue>;
  onApiKeysChange: (value: string[]) => void;
  onModelsChange: (value: string[]) => void;
  onChannelsChange: (value: string[]) => void;
  onStatusesChange: (value: StatusFilterValue[]) => void;
  onApiKeysClear: () => void;
  onModelsClear: () => void;
  onChannelsClear: () => void;
  onStatusesClear: () => void;
  sessionIds: string[];
  logIds: number[];
  scoreMin: number | null;
  scoreMax: number | null;
  reviewedFilter: string;
  interceptedFilter: string;
  onSessionIdsChange: (value: string[]) => void;
  onLogIdsChange: (value: number[]) => void;
  onScoreRangeChange: (min: number | null, max: number | null) => void;
  onReviewedFilterChange: (value: string) => void;
  onInterceptedFilterChange: (value: string) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function RequestLogsFilters({
  keyOptions,
  modelOptions,
  channelOptions,
  statusOptions,
  selectedApiKeys,
  selectedModels,
  selectedChannels,
  selectedStatuses,
  onApiKeysChange,
  onModelsChange,
  onChannelsChange,
  onStatusesChange,
  onApiKeysClear,
  onModelsClear,
  onChannelsClear,
  onStatusesClear,
  sessionIds,
  logIds,
  scoreMin,
  scoreMax,
  reviewedFilter,
  interceptedFilter,
  onSessionIdsChange,
  onLogIdsChange,
  onScoreRangeChange,
  onReviewedFilterChange,
  onInterceptedFilterChange,
  onResetFilters,
  hasActiveFilters,
}: RequestLogsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t border-slate-100 px-5 py-3 dark:border-neutral-800/60">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full min-[480px]:w-auto sm:w-[180px]">
          <SearchableCheckboxMultiSelect
            value={selectedApiKeys ?? []}
            onChange={onApiKeysChange}
            options={keyOptions}
            placeholder={t("request_logs.all_keys_placeholder")}
            searchPlaceholder={t("request_logs.search_keys")}
            selectFilteredLabel={t("request_logs.select_filtered")}
            deselectFilteredLabel={t("request_logs.deselect_filtered")}
            selectedCountLabel={(count: number) => t("request_logs.selected_count", { count })}
            noResultsLabel={t("request_logs.no_filter_results")}
            aria-label={t("request_logs.filter_key")}
            clearLabel={t("request_logs.clear_key_filter")}
            onClear={onApiKeysClear}
            showClearButton
            size="sm"
            emptyValueMeansAllSelected
            emptyValueRepresentsAllSelected={selectedApiKeys === null}
            showFilteredToggleWithoutQuery={false}
            applyMode="manual"
            applyLabel={t("request_logs.apply_filters")}
            cancelLabel={t("common.cancel")}
            selectAllLabel={t("request_logs.select_all")}
            deselectAllLabel={t("request_logs.deselect_all")}
            emptySelectionLabel={t("request_logs.none_selected")}
          />
        </div>
        <RequestLogFacetFilters
          modelOptions={modelOptions}
          channelOptions={channelOptions}
          statusOptions={statusOptions}
          selectedModels={selectedModels}
          selectedChannels={selectedChannels}
          selectedStatuses={selectedStatuses}
          onModelsChange={onModelsChange}
          onChannelsChange={onChannelsChange}
          onStatusesChange={onStatusesChange}
          onModelsClear={onModelsClear}
          onChannelsClear={onChannelsClear}
          onStatusesClear={onStatusesClear}
        />
        <CommittedTextFilter
          value={sessionIds.join(", ")}
          placeholder={t("request_logs.filter_session_ids")}
          onCommit={(text) => onSessionIdsChange(parseStringList(text))}
        />
        <CommittedTextFilter
          value={logIds.join(", ")}
          placeholder={t("request_logs.filter_log_ids")}
          inputMode="numeric"
          onCommit={(text) => onLogIdsChange(parsePositiveIntegerList(text))}
        />
        <ScoreRangeFilter scoreMin={scoreMin} scoreMax={scoreMax} onChange={onScoreRangeChange} />
        <div className="w-full min-[480px]:w-auto sm:w-[160px]">
          <Select
            value={reviewedFilter}
            onChange={onReviewedFilterChange}
            aria-label={t("request_logs.filter_ai_reviewed")}
            options={[
              { value: "", label: t("request_logs.filter_ai_reviewed_all") },
              { value: "true", label: t("request_logs.filter_ai_reviewed_yes") },
              { value: "false", label: t("request_logs.filter_ai_reviewed_no") },
            ]}
            size="sm"
          />
        </div>
        <div className="w-full min-[480px]:w-auto sm:w-[160px]">
          <Select
            value={interceptedFilter}
            onChange={onInterceptedFilterChange}
            aria-label={t("request_logs.filter_intercepted")}
            options={[
              { value: "", label: t("request_logs.filter_intercepted_all") },
              { value: "true", label: t("request_logs.filter_intercepted_yes") },
              { value: "false", label: t("request_logs.filter_intercepted_no") },
            ]}
            size="sm"
          />
        </div>

        {/* Reset filters button */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
              "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
              "dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-white/10",
              "transition-colors",
            )}
          >
            <RotateCcw size={12} aria-hidden="true" />
            {t("request_logs.reset_filters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CommittedTextFilter({
  value,
  placeholder,
  inputMode,
  onCommit,
}: {
  value: string;
  placeholder: string;
  inputMode?: "text" | "numeric";
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  const commit = useCallback(() => onCommit(text), [onCommit, text]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commit();
    },
    [commit],
  );

  return (
    <div className="w-full min-[480px]:w-auto sm:w-[180px]">
      <TextInput
        value={text}
        onChange={(event) => setText(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={placeholder}
        aria-label={placeholder}
        inputMode={inputMode}
        size="sm"
      />
    </div>
  );
}

function ScoreRangeFilter({
  scoreMin,
  scoreMax,
  onChange,
}: {
  scoreMin: number | null;
  scoreMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const { t } = useTranslation();
  const [minText, setMinText] = useState(scoreMin === null ? "" : String(scoreMin));
  const [maxText, setMaxText] = useState(scoreMax === null ? "" : String(scoreMax));

  useEffect(() => setMinText(scoreMin === null ? "" : String(scoreMin)), [scoreMin]);
  useEffect(() => setMaxText(scoreMax === null ? "" : String(scoreMax)), [scoreMax]);

  const commit = useCallback(() => {
    onChange(parseInteger(minText), parseInteger(maxText));
  }, [maxText, minText, onChange]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commit();
    },
    [commit],
  );

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-slate-500 dark:text-white/50">
        {t("request_logs.filter_score")}
      </span>
      <div className="w-[68px]">
        <TextInput
          value={minText}
          onChange={(event) => setMinText(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={t("request_logs.score_min")}
          aria-label={t("request_logs.score_min")}
          inputMode="numeric"
          size="sm"
        />
      </div>
      <span className="text-xs text-slate-400 dark:text-white/40">-</span>
      <div className="w-[68px]">
        <TextInput
          value={maxText}
          onChange={(event) => setMaxText(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={t("request_logs.score_max")}
          aria-label={t("request_logs.score_max")}
          inputMode="numeric"
          size="sm"
        />
      </div>
    </div>
  );
}

function parseStringList(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function parsePositiveIntegerList(text: string): number[] {
  return parseStringList(text)
    .map(Number)
    .filter((value) => Number.isSafeInteger(value) && value > 0);
}

function parseInteger(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? Math.trunc(value) : null;
}

import { useTranslation } from "react-i18next";
import { EmptyState, ToggleSwitch } from "@code-proxy/ui";
import type {
  IdentityFingerprintConfig,
  IdentityFingerprintProvider,
} from "@code-proxy/api-client";

const PROVIDERS: Array<{
  id: IdentityFingerprintProvider;
  labelKey: string;
  descriptionKey: string;
}> = [
  {
    id: "codex",
    labelKey: "identity_fingerprint.codex_enabled",
    descriptionKey: "identity_fingerprint.codex_enabled_desc",
  },
  {
    id: "claude",
    labelKey: "identity_fingerprint.claude_enabled",
    descriptionKey: "identity_fingerprint.claude_enabled_desc",
  },
  {
    id: "gemini",
    labelKey: "identity_fingerprint.gemini_enabled",
    descriptionKey: "identity_fingerprint.gemini_enabled_desc",
  },
  {
    id: "xai",
    labelKey: "identity_fingerprint.xai_enabled",
    descriptionKey: "identity_fingerprint.xai_enabled_desc",
  },
];

interface AuthFilesIdentityFingerprintTabProps {
  config: IdentityFingerprintConfig | null;
  loading: boolean;
  error: string;
  disabled: boolean;
  onProviderEnabledChange: (provider: IdentityFingerprintProvider, enabled: boolean) => void;
}

export function AuthFilesIdentityFingerprintTab({
  config,
  loading,
  error,
  disabled,
  onProviderEnabledChange,
}: AuthFilesIdentityFingerprintTabProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        {t("common.loading_ellipsis")}
      </div>
    );
  }

  if (error || !config) {
    return (
      <EmptyState
        title={t("auth_files_page.identity_load_failed")}
        description={error || t("common.unknown_error")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
        {t("auth_files_page.identity_disable_notice")}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <div
            key={provider.id}
            className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42_/_0.035)] dark:border-white/[0.06] dark:bg-neutral-950/70 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.22)]"
          >
            <ToggleSwitch
              checked={Boolean(config[provider.id]?.enabled)}
              onCheckedChange={(enabled) => onProviderEnabledChange(provider.id, enabled)}
              label={t(provider.labelKey)}
              description={t(provider.descriptionKey)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

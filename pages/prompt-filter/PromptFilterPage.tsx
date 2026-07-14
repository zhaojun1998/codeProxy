import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ListChecks, ScrollText, SlidersHorizontal } from "lucide-react";
import {
  promptFilterApi,
  type PromptFilterConfig,
  type PromptFilterRulesResponse,
} from "@code-proxy/api-client";
import { Card, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from "@code-proxy/ui";
import { OverviewPanel } from "./components/OverviewPanel";
import { LogsPanel } from "./components/LogsPanel";
import { RulesPanel } from "./components/RulesPanel";

type PromptFilterTab = "overview" | "logs" | "rules";

export function PromptFilterPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<PromptFilterTab>(() =>
    searchParams.get("tab") === "logs" || searchParams.has("request_log_id") ? "logs" : "overview",
  );

  const [config, setConfig] = useState<PromptFilterConfig | null>(null);
  const [rules, setRules] = useState<PromptFilterRulesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, rulesRes] = await Promise.all([
        promptFilterApi.getConfig(),
        promptFilterApi.getRules(),
      ]);
      setConfig(configRes["prompt-filter"]);
      setRules(rulesRes);
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("prompt_filter.load_failed"),
      });
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const placeholder = (
    <Card loading={loading}>
      <div className="min-h-[200px]" />
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="sr-only">{t("prompt_filter.title")}</h1>

      <Tabs value={tab} onValueChange={(next) => setTab(next as PromptFilterTab)}>
        <div className="flex">
          <TabsList>
            <TabsTrigger value="overview">
              <SlidersHorizontal size={14} />
              {t("prompt_filter.tab_overview")}
            </TabsTrigger>
            <TabsTrigger value="logs">
              <ScrollText size={14} />
              {t("prompt_filter.tab_logs")}
            </TabsTrigger>
            <TabsTrigger value="rules">
              <ListChecks size={14} />
              {t("prompt_filter.tab_rules")}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4">
          <TabsContent value="overview">
            {config ? <OverviewPanel config={config} onSaved={loadAll} /> : placeholder}
          </TabsContent>

          <TabsContent value="logs">
            <LogsPanel />
          </TabsContent>

          <TabsContent value="rules">
            {config && rules ? (
              <RulesPanel config={config} rules={rules} onSaved={loadAll} />
            ) : (
              placeholder
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

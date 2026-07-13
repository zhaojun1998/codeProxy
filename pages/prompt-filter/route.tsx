import { preloadablePage } from "../preloadablePage";

const { Page: PromptFilterPage, preload } = preloadablePage(() =>
  import("./PromptFilterPage").then((m) => ({ default: m.PromptFilterPage })),
);

export const promptFilterRoute = {
  path: "/runtime/prompt-filter",
  component: "prompt-filter",
  element: <PromptFilterPage />,
  auth: true,
  layout: "dashboard",
  nav: { labelKey: "shell.nav_prompt_filter" },
  redirects: [{ from: "/prompt-filter", to: "/runtime/prompt-filter" }],
  requiredPermission: "prompt_filter.read",
  preload,
};

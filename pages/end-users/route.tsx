import { lazy, Suspense } from "react";
import type { PageRoute } from "../registry";

const EndUsersPage = lazy(() =>
  import("./EndUsersPage").then((m) => ({ default: m.EndUsersPage })),
);

export const endUsersRoute: PageRoute = {
  path: "/access/end-users",
  element: (
    <Suspense fallback={null}>
      <EndUsersPage />
    </Suspense>
  ),
  auth: true,
  layout: "app",
  nav: { labelKey: "shell.nav_end_users" },
  requiredPermission: "end_users.read",
  component: "end-users",
  preload: () => import("./EndUsersPage"),
};

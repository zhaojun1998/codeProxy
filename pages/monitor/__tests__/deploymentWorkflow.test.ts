import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("frontend deployment workflow", () => {
  test("deploys fork main atomically and only after opt-in", () => {
    const workflow = readFileSync("../../.github/workflows/deploy.yml", "utf8");

    for (const marker of [
      "branches: [main]",
      "CODEPROXY_MAIN_AUTO_DEPLOY",
      "github.event_name == 'workflow_dispatch'",
      "username: ${{ vars.SERVER_USER || 'root' }}",
      "relay-panel-releases",
      'mv -Tf "${candidate_link}" "${live_path}"',
      "docker exec nginx test -f",
    ]) {
      expect(workflow).toContain(marker);
    }

    for (const forbidden of [
      "branches: [dev]",
      "--repo kittors/CliRelay",
      "gh workflow run docker-publish.yml",
    ]) {
      expect(workflow).not.toContain(forbidden);
    }
  });
});

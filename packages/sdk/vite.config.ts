import { defineConfig } from "vitest/config";

import { createBuildConfig, createTestConfig } from "../../vite.config.base.ts";

export default defineConfig({
  build: createBuildConfig({
    entry: { index: "./src/index.ts" },
    external: ["@ikko-dev/ghost-api"],
  }),
  test: createTestConfig({ name: "sdk" }),
});

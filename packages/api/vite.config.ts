import { defineConfig } from "vitest/config";

import { createBuildConfig, createTestConfig } from "../../vite.config.base.ts";

export default defineConfig({
  build: createBuildConfig({
    entry: { index: "./src/index.ts" },
  }),
  test: createTestConfig({ name: "api" }),
});

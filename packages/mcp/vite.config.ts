import { defineConfig } from "vitest/config";

import { createBuildConfig, createTestConfig } from "../../vite.config.base.ts";

export default defineConfig({
  build: createBuildConfig({
    entry: {
      index: "./src/index.ts",
      server: "./src/server.ts",
    },
    external: [
      "@ikko-dev/ghost-api",
      "@ikko-dev/ghost-core",
      /^@modelcontextprotocol\/sdk/,
      /^h3/,
    ],
  }),
  test: createTestConfig({ name: "mcp" }),
});

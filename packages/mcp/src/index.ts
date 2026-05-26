#!/usr/bin/env node
/* eslint-disable typescript-eslint/no-deprecated -- low-level Server for StdioServerTransport */

/**
 * Ghost MCP Server — stdio transport.
 *
 * Local execution mode for Claude Desktop config. For remote HTTP deployment,
 * use the `ghost-mcp-server` binary (server.ts) instead.
 *
 * Usage:
 *   GHOST_URL=https://my-blog.ghost.io \
 *   GHOST_STAFF_TOKEN=id:hex \
 *   npx ghost-mcp
 *
 * Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "ghost": {
 *         "command": "ghost-mcp",
 *         "env": {
 *           "GHOST_URL": "https://my-blog.ghost.io",
 *           "GHOST_STAFF_TOKEN": "id:hex"
 *         }
 *       }
 *     }
 *   }
 */

// eslint-disable-next-line typescript-eslint/no-deprecated
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

import { parseReadOnlyFlag } from "./flags.ts";
import { INSTRUCTIONS } from "./instructions.ts";
import { getAvailableTools, handleToolCall } from "./stdio.ts";
import { VERSION } from "./version.ts";

export { parseReadOnlyFlag } from "./flags.ts";

export interface StdioServerOptions {
  readOnly?: boolean;
}

export function createStdioServer(options?: StdioServerOptions): Server {
  const readOnly = options?.readOnly ?? false;

  const server = new Server(
    { name: "ghost-mcp", version: VERSION },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getAvailableTools({ readOnly }),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await handleToolCall(name, args ?? {}, { readOnly });
      return result as CallToolResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        structuredContent: { success: false, error: message },
        isError: true,
      };
    }
  });

  return server;
}

export async function startStdioServer(options?: StdioServerOptions): Promise<void> {
  const server = createStdioServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const mode = options?.readOnly ? " (read-only)" : "";
  console.error(`Ghost MCP server v${VERSION} running on stdio${mode}`);
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/ghost-mcp") ||
  process.argv[1]?.endsWith("\\ghost-mcp");

if (isMainModule) {
  const readOnly = parseReadOnlyFlag();
  startStdioServer({ readOnly }).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

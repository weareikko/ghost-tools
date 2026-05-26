/**
 * Stdio-mode tool dispatcher.
 *
 * In stdio mode credentials come from env vars / config file (not from a
 * per-request Authorization header). The `ghost_configure` / `ghost_get_config`
 * helpers let users save credentials persistently.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  getContentApiKey,
  getStaffAccessToken,
  getUrl,
  setContentApiKey,
  setStaffAccessToken,
  setUrl,
} from "@ikko-dev/ghost-api";

import { executeToolWithCredentials, type ToolResult } from "./handlers.ts";
import { getTools, STDIO_ONLY_TOOLS, type GetToolsOptions } from "./tools.ts";

export type { ToolResult } from "./handlers.ts";

export function getAvailableTools(options?: GetToolsOptions): Tool[] {
  return [...getTools(options), ...STDIO_ONLY_TOOLS];
}

export interface HandleToolCallOptions {
  readOnly?: boolean;
}

function ok(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function fail(message: string): ToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    structuredContent: { success: false, error: message },
    isError: true,
  };
}

export function handleConfigureTool(args: {
  url?: string;
  staffAccessToken?: string;
  contentApiKey?: string;
}): ToolResult {
  if (!args.url && !args.staffAccessToken && !args.contentApiKey) {
    return fail("At least one of url, staffAccessToken, contentApiKey is required.");
  }
  if (args.url) setUrl(args.url);
  if (args.staffAccessToken) setStaffAccessToken(args.staffAccessToken);
  if (args.contentApiKey) setContentApiKey(args.contentApiKey);
  return ok({
    success: true,
    message: "Ghost configuration updated.",
    url: args.url,
    staffAccessToken: args.staffAccessToken ? `***${args.staffAccessToken.slice(-4)}` : undefined,
    contentApiKey: args.contentApiKey ? `***${args.contentApiKey.slice(-4)}` : undefined,
  });
}

export function handleGetConfigTool(): ToolResult {
  const url = getUrl();
  const staff = getStaffAccessToken();
  const content = getContentApiKey();
  return ok({
    url: url ?? "not configured",
    staffAccessToken: staff ? `***${staff.slice(-4)}` : "not configured",
    contentApiKey: content ? `***${content.slice(-4)}` : "not configured",
    configured: Boolean(url && (staff || content)),
  });
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  options?: HandleToolCallOptions,
): Promise<ToolResult> {
  if (name === "ghost_configure") {
    return handleConfigureTool({
      url: typeof args.url === "string" ? args.url : undefined,
      staffAccessToken:
        typeof args.staffAccessToken === "string" ? args.staffAccessToken : undefined,
      contentApiKey: typeof args.contentApiKey === "string" ? args.contentApiKey : undefined,
    });
  }

  if (name === "ghost_get_config") {
    return handleGetConfigTool();
  }

  if (name === "ghost_write" && options?.readOnly) {
    return fail("Server is running in read-only mode. Write operations are disabled.");
  }

  if (name === "ghost" || name === "ghost_write") {
    const url = getUrl();
    const staff = getStaffAccessToken();
    const content = getContentApiKey();
    if (!url) {
      return fail("Ghost site URL not configured. Use the ghost_configure tool or set GHOST_URL.");
    }
    if (!staff && !content) {
      return fail(
        "No credentials configured. Use ghost_configure or set GHOST_STAFF_TOKEN / GHOST_CONTENT_KEY.",
      );
    }
    return executeToolWithCredentials(name, args, {
      ghostUrl: url.replace(/\/$/, ""),
      staffAccessToken: staff ?? undefined,
      contentApiKey: content ?? undefined,
    });
  }

  return fail(`Unknown tool "${name}".`);
}

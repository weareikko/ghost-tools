#!/usr/bin/env node

/**
 * Ghost MCP Server — HTTP transport.
 *
 * Stateless OAuth 2.1 + PKCE. Users connect by visiting /authorize, entering
 * their Ghost site URL and Staff Access Token (and optional Content API key).
 * The MCP client (Claude Desktop, claude.ai) then holds the resulting access
 * token and sends it as `Authorization: Bearer <token>` on every /mcp call.
 *
 * Environment variables:
 *   PORT             - HTTP port (default 3000)
 *   HOST             - Bind address (default 0.0.0.0)
 *   GHOST_READ_ONLY  - Disable the ghost_write tool (default false)
 *   OAUTH_SECRET     - AES-256-GCM key for OAuth tokens. Required in production.
 */

import { toNodeHandler } from "h3/node";
import { createServer, type Server } from "node:http";

import { parsePublicFlag, parseReadOnlyFlag } from "./flags.ts";
import { createHealthApp, createMcpRequestHandler, type HttpServerOptions } from "./http.ts";
import { SessionManager } from "./sessions.ts";
import { VERSION } from "./version.ts";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";

export interface HttpStartOptions {
  readOnly?: boolean;
  /** Run in public content mode — no auth, Content API only. */
  publicMode?: boolean;
}

export function startHttpServer(
  port: number = DEFAULT_PORT,
  host: string = DEFAULT_HOST,
  options?: HttpStartOptions,
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const readOnly = options?.readOnly ?? false;
    const publicMode = options?.publicMode ?? false;

    // Resolve MCP handler options, validating env vars in public mode.
    let mcpOptions: HttpServerOptions;
    if (publicMode) {
      const ghostUrl = process.env.GHOST_URL?.replace(/\/$/, "");
      const contentApiKey = process.env.GHOST_CONTENT_KEY;
      if (!ghostUrl) {
        reject(new Error("--public mode requires the GHOST_URL environment variable."));
        return;
      }
      if (!contentApiKey) {
        reject(new Error("--public mode requires the GHOST_CONTENT_KEY environment variable."));
        return;
      }
      mcpOptions = {
        publicMode: true,
        _publicCredentials: { ghostUrl, contentApiKey },
      };
    } else {
      mcpOptions = { readOnly };
    }

    const sessions = new SessionManager();
    const handleMcp = createMcpRequestHandler(sessions, mcpOptions);
    const healthApp = createHealthApp();
    const healthHandler = toNodeHandler(healthApp);

    const server = createServer(async (req, res) => {
      const url = req.url ?? "/";
      const start = Date.now();
      const auth = req.headers.authorization ? "+auth" : publicMode ? "public" : "";
      const ua = (req.headers["user-agent"] ?? "").slice(0, 40);
      const log = () => {
        console.log(
          `[req] ${req.method} ${url} -> ${res.statusCode} ${auth} ua="${ua}" (${Date.now() - start}ms)`,
        );
      };
      // eslint-disable-next-line unicorn/prefer-add-event-listener -- consistent with other Node http style
      res.on("finish", log);
      if (url === "/mcp" || url.startsWith("/mcp?")) {
        await handleMcp(req, res);
        return;
      }
      healthHandler(req, res);
    });

    server.listen(port, host, () => {
      const display = host === "0.0.0.0" ? "localhost" : host;

      if (publicMode) {
        console.log(`Ghost MCP server v${VERSION} — public content mode`);
        console.log(`Running at http://${display}:${port}`);
        console.log("");
        console.log("Mode: PUBLIC — no authentication required");
        console.log(`Ghost URL: ${process.env.GHOST_URL}`);
        console.log("");
        console.log("Endpoints:");
        console.log(`  POST/GET/DELETE http://${display}:${port}/mcp — MCP Streamable HTTP`);
        console.log(`  GET  http://${display}:${port}/health — Health check`);
        console.log("");
        console.log("Resources (Content API only): posts, pages, tags, tiers, authors");
      } else {
        const mode = readOnly ? " (read-only)" : "";
        console.log(`Ghost MCP server v${VERSION}${mode}`);
        console.log(`Running at http://${display}:${port}`);
        console.log("");
        console.log("Endpoints:");
        console.log(`  POST/GET/DELETE http://${display}:${port}/mcp - MCP Streamable HTTP`);
        console.log(`  GET  http://${display}:${port}/health - Health check`);
        console.log("");
        console.log("OAuth 2.1 (login form):");
        console.log(`  GET  http://${display}:${port}/authorize`);
        console.log(`  POST http://${display}:${port}/token`);
        if (readOnly) {
          console.log("");
          console.log("Mode: READ-ONLY (write operations disabled)");
        }
      }

      resolve(server);
    });
  });
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/ghost-mcp-server") ||
  process.argv[1]?.endsWith("\\ghost-mcp-server");

if (isMainModule) {
  const port = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  const host = process.env.HOST || DEFAULT_HOST;
  const readOnly = parseReadOnlyFlag();
  const publicMode = parsePublicFlag();
  startHttpServer(port, host, { readOnly, publicMode }).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

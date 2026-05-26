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
 *   GHOST_PUBLIC     - Public content mode: no auth, Content API only at /mcp
 *   GHOST_DUAL       - Dual mode: /mcp (public) + /admin/mcp (OAuth admin)
 *   GHOST_URL        - Ghost site URL (required for --public and --dual)
 *   GHOST_CONTENT_KEY- Content API key (required for --public and --dual)
 *   GHOST_URL_LOCK   - Lock the OAuth login form to a specific Ghost URL
 *   OAUTH_SECRET     - AES-256-GCM key for OAuth tokens. Required in production.
 */

import { toNodeHandler } from "h3/node";
import { createServer, type Server } from "node:http";

import {
  parseDualModeFlag,
  parseGhostUrlLock,
  parsePublicFlag,
  parseReadOnlyFlag,
} from "./flags.ts";
import { createHealthApp, createMcpRequestHandler, type HttpServerOptions } from "./http.ts";
import { SessionManager } from "./sessions.ts";
import { VERSION } from "./version.ts";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";

export interface HttpStartOptions {
  readOnly?: boolean;
  /** Run in public content mode — no auth, Content API only at `/mcp`. */
  publicMode?: boolean;
  /**
   * Dual mode — serve both endpoints from one process:
   *   `/mcp`       → public content (no auth, Content API)
   *   `/admin/mcp` → admin (OAuth 2.1 + PKCE)
   *
   * Requires `GHOST_URL` + `GHOST_CONTENT_KEY` for the public endpoint.
   */
  dualMode?: boolean;
}

/** Read and validate the public content credentials from env. Throws on failure. */
function loadPublicCredentials(): { ghostUrl: string; contentApiKey: string } {
  const ghostUrl = process.env.GHOST_URL?.replace(/\/$/, "");
  const contentApiKey = process.env.GHOST_CONTENT_KEY;
  if (!ghostUrl)
    throw new Error("GHOST_URL environment variable is required for public/dual mode.");
  if (!contentApiKey)
    throw new Error("GHOST_CONTENT_KEY environment variable is required for public/dual mode.");
  return { ghostUrl, contentApiKey };
}

export function startHttpServer(
  port: number = DEFAULT_PORT,
  host: string = DEFAULT_HOST,
  options?: HttpStartOptions,
): Promise<Server> {
  return new Promise((resolve, reject) => {
    const readOnly = options?.readOnly ?? false;
    const publicMode = options?.publicMode ?? false;
    const dualMode = options?.dualMode ?? false;

    if (publicMode && dualMode) {
      reject(new Error("--public and --dual are mutually exclusive. Choose one."));
      return;
    }

    // ── Build per-mode handler(s) ─────────────────────────────────────────

    type McpHandler = ReturnType<typeof createMcpRequestHandler>;
    let handlePublicMcp: McpHandler | null = null;
    let handleAdminMcp: McpHandler | null = null;
    let healthApp: ReturnType<typeof createHealthApp>;

    try {
      if (dualMode) {
        const { ghostUrl, contentApiKey } = loadPublicCredentials();

        const publicOptions: HttpServerOptions = {
          publicMode: true,
          _publicCredentials: { ghostUrl, contentApiKey },
        };
        const adminOptions: HttpServerOptions = { readOnly };

        // Separate session managers to prevent cross-endpoint session reuse.
        handlePublicMcp = createMcpRequestHandler(new SessionManager(), publicOptions);
        handleAdminMcp = createMcpRequestHandler(new SessionManager(), adminOptions);
        healthApp = createHealthApp({ adminMcpPath: "/admin/mcp" });
      } else if (publicMode) {
        const { ghostUrl, contentApiKey } = loadPublicCredentials();

        const publicOptions: HttpServerOptions = {
          publicMode: true,
          _publicCredentials: { ghostUrl, contentApiKey },
        };
        handlePublicMcp = createMcpRequestHandler(new SessionManager(), publicOptions);
        healthApp = createHealthApp();
      } else {
        handleAdminMcp = createMcpRequestHandler(new SessionManager(), { readOnly });
        healthApp = createHealthApp();
      }
    } catch (error) {
      reject(error);
      return;
    }

    const healthHandler = toNodeHandler(healthApp);

    // ── HTTP server ───────────────────────────────────────────────────────

    const server = createServer(async (req, res) => {
      const url = req.url ?? "/";
      const start = Date.now();
      const auth = req.headers.authorization ? "+auth" : "";
      const ua = (req.headers["user-agent"] ?? "").slice(0, 40);
      const log = () => {
        console.log(
          `[req] ${req.method} ${url} -> ${res.statusCode} ${auth} ua="${ua}" (${Date.now() - start}ms)`,
        );
      };
      // eslint-disable-next-line unicorn/prefer-add-event-listener -- consistent with other Node http style
      res.on("finish", log);

      if (dualMode) {
        if (url === "/mcp" || url.startsWith("/mcp?")) {
          await handlePublicMcp!(req, res);
          return;
        }
        if (url === "/admin/mcp" || url.startsWith("/admin/mcp?")) {
          await handleAdminMcp!(req, res);
          return;
        }
      } else if (url === "/mcp" || url.startsWith("/mcp?")) {
        await (handlePublicMcp ?? handleAdminMcp)!(req, res);
        return;
      }

      healthHandler(req, res);
    });

    // ── Startup log ───────────────────────────────────────────────────────

    server.listen(port, host, () => {
      const display = host === "0.0.0.0" ? "localhost" : host;
      const base = `http://${display}:${port}`;

      if (dualMode) {
        console.log(`Ghost MCP server v${VERSION} — dual mode`);
        console.log(`Running at ${base}`);
        console.log("");
        console.log("Endpoints:");
        console.log(`  POST/GET/DELETE ${base}/mcp       — Content API (public, no auth)`);
        console.log(`  POST/GET/DELETE ${base}/admin/mcp — Admin API  (OAuth 2.1 + PKCE)`);
        console.log(`  GET  ${base}/health`);
        console.log("");
        console.log("OAuth 2.1 (for /admin/mcp):");
        console.log(`  GET  ${base}/authorize`);
        console.log(`  POST ${base}/token`);
        console.log("");
        console.log(`Ghost URL: ${process.env.GHOST_URL}`);
        console.log("Content resources: posts, pages, tags, tiers, authors");
        if (readOnly) {
          console.log("Admin mode: READ-ONLY (ghost_write disabled)");
        }
      } else if (publicMode) {
        console.log(`Ghost MCP server v${VERSION} — public content mode`);
        console.log(`Running at ${base}`);
        console.log("");
        console.log("Mode: PUBLIC — no authentication required");
        console.log(`Ghost URL: ${process.env.GHOST_URL}`);
        console.log("");
        console.log("Endpoints:");
        console.log(`  POST/GET/DELETE ${base}/mcp — MCP Streamable HTTP`);
        console.log(`  GET  ${base}/health — Health check`);
        console.log("");
        console.log("Resources (Content API only): posts, pages, tags, tiers, authors");
      } else {
        const mode = readOnly ? " (read-only)" : "";
        console.log(`Ghost MCP server v${VERSION}${mode}`);
        console.log(`Running at ${base}`);
        console.log("");
        console.log("Endpoints:");
        console.log(`  POST/GET/DELETE ${base}/mcp - MCP Streamable HTTP`);
        console.log(`  GET  ${base}/health - Health check`);
        console.log("");
        console.log("OAuth 2.1 (login form):");
        console.log(`  GET  ${base}/authorize`);
        console.log(`  POST ${base}/token`);
        const urlLock = parseGhostUrlLock();
        if (urlLock) {
          console.log("");
          console.log(`Ghost URL lock: ${urlLock} (login form is restricted to this site)`);
        }
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
  const dualMode = parseDualModeFlag();
  startHttpServer(port, host, { readOnly, publicMode, dualMode }).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

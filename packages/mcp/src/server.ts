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

import { toNodeHandler } from 'h3/node';
import { createServer, type Server } from 'node:http';

import { parseReadOnlyFlag } from './flags.ts';
import { createHealthApp, createMcpRequestHandler } from './http.ts';
import { SessionManager } from './sessions.ts';
import { VERSION } from './version.ts';

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';

export interface HttpStartOptions {
  readOnly?: boolean;
}

export function startHttpServer(
  port: number = DEFAULT_PORT,
  host: string = DEFAULT_HOST,
  options?: HttpStartOptions,
): Promise<Server> {
  return new Promise((resolve) => {
    const readOnly = options?.readOnly ?? false;
    const sessions = new SessionManager();
    const handleMcp = createMcpRequestHandler(sessions, { readOnly });
    const healthApp = createHealthApp();
    const healthHandler = toNodeHandler(healthApp);

    const server = createServer(async (req, res) => {
      const url = req.url ?? '/';
      if (url === '/mcp' || url.startsWith('/mcp?')) {
        await handleMcp(req, res);
        return;
      }
      healthHandler(req, res);
    });

    server.listen(port, host, () => {
      const display = host === '0.0.0.0' ? 'localhost' : host;
      const mode = readOnly ? ' (read-only)' : '';
      console.log(`Ghost MCP server v${VERSION}${mode}`);
      console.log(`Running at http://${display}:${port}`);
      console.log('');
      console.log('Endpoints:');
      console.log(`  POST/GET/DELETE http://${display}:${port}/mcp - MCP Streamable HTTP`);
      console.log(`  GET  http://${display}:${port}/health - Health check`);
      console.log('');
      console.log('OAuth 2.1 (login form):');
      console.log(`  GET  http://${display}:${port}/authorize`);
      console.log(`  POST http://${display}:${port}/token`);
      if (readOnly) {
        console.log('');
        console.log('Mode: READ-ONLY (write operations disabled)');
      }
      resolve(server);
    });
  });
}

const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('/ghost-mcp-server') ||
  process.argv[1]?.endsWith('\\ghost-mcp-server');

if (isMainModule) {
  const port = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  const host = process.env.HOST || DEFAULT_HOST;
  const readOnly = parseReadOnlyFlag();
  startHttpServer(port, host, { readOnly }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

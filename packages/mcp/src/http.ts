/* eslint-disable typescript-eslint/no-deprecated -- low-level Server for StreamableHTTPServerTransport */

/**
 * Streamable HTTP transport for the Ghost MCP server.
 *
 * Implements the MCP Streamable HTTP transport (2025-03-26 spec) using the
 * official SDK's StreamableHTTPServerTransport.
 *
 * Architecture:
 * - Stateful per-session transport+server pairs
 * - Auth via Bearer token → credentials parsed per-request, no server state
 * - OAuth 2.1 + PKCE endpoints handled by h3 (see oauth.ts)
 * - MCP requests routed straight to the SDK transport
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// eslint-disable-next-line typescript-eslint/no-deprecated
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { H3, defineEventHandler } from 'h3';

import type { GhostCredentials } from './auth.ts';
import { parseAuthHeader } from './auth.ts';
import { executeToolWithCredentials } from './handlers.ts';
import { INSTRUCTIONS } from './instructions.ts';
import {
  authorizeGetHandler,
  authorizePostHandler,
  oauthMetadataHandler,
  protectedResourceHandler,
  registerHandler,
  tokenHandler,
} from './oauth.ts';
import { SessionManager } from './sessions.ts';
import { getTools } from './tools.ts';
import { VERSION } from './version.ts';

export { SessionManager } from './sessions.ts';

export interface HttpServerOptions {
  /** When true, `ghost_write` is not registered. */
  readOnly?: boolean;
}

/**
 * Build an MCP Server instance for the HTTP transport.
 */
export function createMcpServer(options?: HttpServerOptions): Server {
  const readOnly = options?.readOnly ?? false;
  const tools = getTools({ readOnly });

  const server = new Server(
    { name: 'ghost-mcp', version: VERSION },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    const authInfo = extra.authInfo as
      | {
          token?: string;
          credentials?: GhostCredentials;
        }
      | undefined;

    const credentials = authInfo?.credentials;

    /* v8 ignore start */
    if (!credentials) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Authentication required.' }],
        structuredContent: { success: false, error: 'Authentication required.' },
        isError: true,
      };
    }
    /* v8 ignore stop */

    if (readOnly && name === 'ghost_write') {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Error: Server is running in read-only mode. Write operations are disabled.',
          },
        ],
        structuredContent: {
          success: false,
          error: 'Server is running in read-only mode. Write operations are disabled.',
        },
        isError: true,
      };
    }

    const result = await executeToolWithCredentials(name, /* v8 ignore next */ args ?? {}, credentials);
    return result as CallToolResult;
  });

  return server;
}

/**
 * Per-request handler used by the bare HTTP server.
 */
export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  sessions: SessionManager,
  options?: HttpServerOptions,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const credentials = parseAuthHeader(authHeader);

  if (!credentials) {
    const host = req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'];
    const protocol = (typeof proto === 'string' ? proto : undefined) || 'http';
    const resourceMetadataUrl = `${protocol}://${host}/.well-known/oauth-protected-resource`;

    res.writeHead(401, {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer resource_metadata="${resourceMetadataUrl}"`,
    });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message:
            'Authentication required. Provide a Bearer token containing your Ghost credentials. Visit /authorize to obtain one.',
        },
        id: null,
      }),
    );
    return;
  }

  // Stash credentials on the request — the MCP SDK forwards `auth` to handlers as `extra.authInfo`
  Object.assign(req, {
    auth: {
      token: authHeader,
      clientId: 'ghost-http-client',
      scopes: [],
      credentials,
    },
  });

  const sessionHeader = req.headers['mcp-session-id'];
  const sessionId = typeof sessionHeader === 'string' ? sessionHeader : undefined;

  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Session not found. It may have expired or been terminated.',
          },
          id: null,
        }),
      );
      return;
    }
    await session.transport.handleRequest(req, res);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  const server = createMcpServer(options);
  await server.connect(transport);

  // eslint-disable-next-line unicorn/prefer-add-event-listener -- SDK uses property assignment
  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) {
      sessions.remove(sid).catch(() => {});
    }
  };

  await transport.handleRequest(req, res);

  if (transport.sessionId) {
    sessions.register(transport, server);
  } else {
    /* v8 ignore start */
    await transport.close();
    await server.close();
    /* v8 ignore stop */
  }
}

export function createMcpRequestHandler(
  sessions: SessionManager,
  options?: HttpServerOptions,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return (req, res) => handleMcpRequest(req, res, sessions, options);
}

/**
 * h3 app handling everything that isn't the MCP endpoint (health, OAuth).
 */
export function createHealthApp(): H3 {
  const app = new H3();

  app.get(
    '/',
    defineEventHandler(() => ({ status: 'ok', service: 'ghost-mcp', version: VERSION })),
  );
  app.get('/health', defineEventHandler(() => ({ status: 'ok' })));

  app.get('/.well-known/oauth-authorization-server', oauthMetadataHandler);
  app.get('/.well-known/oauth-protected-resource', protectedResourceHandler);
  app.post('/register', registerHandler);
  app.get('/authorize', authorizeGetHandler);
  app.post('/authorize', authorizePostHandler);
  app.post('/token', tokenHandler);

  return app;
}

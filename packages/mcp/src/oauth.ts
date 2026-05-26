/**
 * OAuth 2.1 + PKCE endpoints for the Ghost MCP HTTP server.
 *
 * Stateless — the authorization code carries an AES-256-GCM-encrypted payload
 * with the user's credentials and the PKCE challenge. The server keeps nothing.
 *
 * Flow:
 *   1. MCP client redirects user to /authorize with PKCE params
 *   2. User submits the login form (ghost URL + staff access token + optional content key)
 *   3. Server encrypts credentials + challenge into an authorization code, redirects back
 *   4. Client exchanges code for access token at /token (with code_verifier)
 *   5. Server validates PKCE, returns base64url(JSON credentials) as access_token
 */

import { defineEventHandler, getQuery, readBody, type H3Event } from "h3";
import { createHash } from "node:crypto";

import { createAuthToken, debugAuth, summarizeSecret } from "./auth.ts";
import { createAuthCode, decodeAuthCode } from "./crypto.ts";
import { parseGhostUrlLock } from "./flags.ts";

function baseUrl(event: H3Event): string {
  const host = event.req.headers.get("host") ?? "localhost:3000";
  const proto = event.req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function tokenResponse(accessToken: string, refreshToken: string): Record<string, unknown> {
  const response = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: "ghost",
  };
  debugAuth("oauth.token.response", {
    accessToken: summarizeSecret(accessToken),
    refreshToken: { present: true, length: refreshToken.length },
    tokenType: response.token_type,
    expiresIn: response.expires_in,
    scope: response.scope,
  });
  return response;
}

export const oauthMetadataHandler = defineEventHandler((event: H3Event) => {
  const url = baseUrl(event);
  event.res.headers.set("Content-Type", "application/json");
  event.res.headers.set("Cache-Control", "public, max-age=3600");
  return {
    issuer: url,
    authorization_endpoint: `${url}/authorize`,
    token_endpoint: `${url}/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    registration_endpoint: `${url}/register`,
    scopes_supported: ["ghost"],
    service_documentation: "https://github.com/ikko-dev/ghost-tools",
  };
});

/**
 * Factory for the OAuth protected-resource metadata handler.
 *
 * `mcpPath` is the URL path of the MCP endpoint being protected, e.g. `/mcp`
 * (default) or `/admin/mcp` (dual-mode). The resulting handler is registered at
 * `/.well-known/oauth-protected-resource` and `/.well-known/oauth-protected-resource/**`.
 */
export function createProtectedResourceHandler(mcpPath = "/mcp") {
  return defineEventHandler((event: H3Event) => {
    const url = baseUrl(event);
    event.res.headers.set("Content-Type", "application/json");
    event.res.headers.set("Cache-Control", "public, max-age=3600");
    return {
      resource: `${url}${mcpPath}`,
      authorization_servers: [url],
      bearer_methods_supported: ["header"],
      scopes_supported: ["ghost"],
    };
  });
}

/** Default protected-resource handler for single-endpoint deployments. */
export const protectedResourceHandler = createProtectedResourceHandler();

export const registerHandler = defineEventHandler(async (event: H3Event) => {
  event.res.headers.set("Content-Type", "application/json");
  let body: Record<string, unknown> = {};
  try {
    const raw = (await readBody(event)) as unknown;
    body = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  } catch {
    event.res.status = 400;
    return { error: "invalid_request", error_description: "Invalid JSON body" };
  }
  const clientName = typeof body.client_name === "string" ? body.client_name : "MCP Client";
  const redirectUris = Array.isArray(body.redirect_uris) ? (body.redirect_uris as string[]) : [];
  const clientId = Buffer.from(JSON.stringify({ name: clientName, ts: Date.now() })).toString(
    "base64url",
  );
  event.res.status = 201;
  return {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  };
});

export const authorizeGetHandler = defineEventHandler((event: H3Event) => {
  const query = getQuery(event);
  const redirectUri = String(query.redirect_uri ?? "");
  const state = String(query.state ?? "");
  const codeChallenge = String(query.code_challenge ?? "");
  const codeChallengeMethod = String(query.code_challenge_method ?? "");

  event.res.headers.set("Content-Type", "text/html; charset=utf-8");

  if (!redirectUri) {
    event.res.status = 400;
    return renderErrorPage("Missing required parameter: redirect_uri");
  }

  if (!codeChallenge) {
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "invalid_request");
    errorUrl.searchParams.set("error_description", "code_challenge is required (PKCE)");
    if (state) errorUrl.searchParams.set("state", state);
    return Response.redirect(errorUrl.toString(), 302);
  }

  if (codeChallengeMethod && codeChallengeMethod !== "S256") {
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "invalid_request");
    errorUrl.searchParams.set("error_description", "Only S256 code_challenge_method is supported");
    if (state) errorUrl.searchParams.set("state", state);
    return Response.redirect(errorUrl.toString(), 302);
  }

  return renderLoginForm({
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod: codeChallengeMethod || "S256",
    ghostUrlLock: parseGhostUrlLock(),
  });
});

export const authorizePostHandler = defineEventHandler(async (event: H3Event) => {
  const body = ((await readBody(event)) as Record<string, string>) ?? {};
  const {
    staffAccessToken,
    contentApiKey,
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod,
  } = body;

  // Server-side enforcement: if GHOST_URL_LOCK is set, always use its value
  // regardless of what the client submitted, preventing bypass via crafted requests.
  const ghostUrlLock = parseGhostUrlLock();
  const ghostUrl = ghostUrlLock ?? body.ghostUrl;

  event.res.headers.set("Content-Type", "text/html; charset=utf-8");

  if (!redirectUri) {
    event.res.status = 400;
    return renderErrorPage("Missing redirect_uri parameter");
  }
  try {
    const uri = new URL(redirectUri);
    const isLocalhost = uri.hostname === "localhost" || uri.hostname === "127.0.0.1";
    const isHttps = uri.protocol === "https:";
    if (!isLocalhost && !isHttps) {
      event.res.status = 400;
      return renderErrorPage("redirect_uri must be HTTPS or localhost");
    }
  } catch {
    event.res.status = 400;
    return renderErrorPage("Invalid redirect_uri format");
  }

  if (!ghostUrl || (!staffAccessToken && !contentApiKey)) {
    return renderLoginForm({
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
      ghostUrl,
      ghostUrlLock,
      error: "Ghost site URL and at least one credential are required",
    });
  }

  // Validate URL format
  if (!URL.canParse(ghostUrl)) {
    return renderLoginForm({
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
      ghostUrl,
      ghostUrlLock,
      error: "Ghost site URL is not a valid URL",
    });
  }

  const code = createAuthCode({
    ghostUrl: ghostUrl.replace(/\/$/, ""),
    staffAccessToken: staffAccessToken || undefined,
    contentApiKey: contentApiKey || undefined,
    codeChallenge,
    codeChallengeMethod: codeChallengeMethod || "S256",
  });

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  return renderSuccessPage(redirectUrl.toString());
});

export const tokenHandler = defineEventHandler(async (event: H3Event) => {
  event.res.headers.set("Content-Type", "application/json");
  const body = ((await readBody(event)) as Record<string, string>) ?? {};
  const { grant_type, code, code_verifier, refresh_token } = body;

  if (grant_type === "refresh_token") {
    return handleRefreshToken(event, refresh_token);
  }
  if (grant_type !== "authorization_code") {
    event.res.status = 400;
    return {
      error: "unsupported_grant_type",
      error_description: "Supported grant types: authorization_code, refresh_token",
    };
  }
  if (!code) {
    event.res.status = 400;
    return { error: "invalid_request", error_description: "Missing authorization code" };
  }
  if (!code_verifier) {
    event.res.status = 400;
    return { error: "invalid_request", error_description: "Missing code_verifier (PKCE required)" };
  }

  try {
    const payload = decodeAuthCode(code);
    if (payload.codeChallenge) {
      const expected = createS256Challenge(code_verifier);
      if (expected !== payload.codeChallenge) {
        event.res.status = 400;
        return { error: "invalid_grant", error_description: "Invalid code_verifier" };
      }
    }
    const accessToken = createAuthToken({
      ghostUrl: payload.ghostUrl,
      staffAccessToken: payload.staffAccessToken,
      contentApiKey: payload.contentApiKey,
    });
    const refreshToken = createAuthCode(
      {
        ghostUrl: payload.ghostUrl,
        staffAccessToken: payload.staffAccessToken,
        contentApiKey: payload.contentApiKey,
      },
      86400 * 30,
    );
    return tokenResponse(accessToken, refreshToken);
  } catch (error) {
    event.res.status = 400;
    return {
      error: "invalid_grant",
      error_description: error instanceof Error ? error.message : "Invalid authorization code",
    };
  }
});

function handleRefreshToken(event: H3Event, refreshToken: string | undefined) {
  if (!refreshToken) {
    event.res.status = 400;
    return { error: "invalid_request", error_description: "Missing refresh_token" };
  }
  try {
    const payload = decodeAuthCode(refreshToken);
    const accessToken = createAuthToken({
      ghostUrl: payload.ghostUrl,
      staffAccessToken: payload.staffAccessToken,
      contentApiKey: payload.contentApiKey,
    });
    const newRefresh = createAuthCode(
      {
        ghostUrl: payload.ghostUrl,
        staffAccessToken: payload.staffAccessToken,
        contentApiKey: payload.contentApiKey,
      },
      86400 * 30,
    );
    return tokenResponse(accessToken, newRefresh);
  } catch (error) {
    event.res.status = 400;
    return {
      error: "invalid_grant",
      error_description: error instanceof Error ? error.message : "Invalid refresh token",
    };
  }
}

export function createS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLoginForm(params: {
  redirectUri?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  ghostUrl?: string;
  /** When set, the Ghost site URL field is pre-filled and locked to this value. */
  ghostUrlLock?: string;
  error?: string;
}): string {
  const { redirectUri, state, codeChallenge, codeChallengeMethod, ghostUrlLock, error } = params;
  // When locked, always use the lock value for the URL field.
  const ghostUrl = ghostUrlLock ?? params.ghostUrl;
  const isLocked = Boolean(ghostUrlLock);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to Ghost</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #15171a 0%, #2c2f33 100%);
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .container { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px; width: 100%; max-width: 460px; }
    .logo { text-align: center; margin-bottom: 24px; font-size: 28px; font-weight: 700; color: #15171a; letter-spacing: -0.5px; }
    .logo span { color: #ff1a75; }
    h1 { text-align: center; color: #15171a; font-size: 22px; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 28px; }
    .error { background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
    .notice { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.4; }
    .notice-lock { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.4; }
    .form-group { margin-bottom: 18px; }
    label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px; }
    input { width: 100%; padding: 11px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 15px; }
    input:focus { outline: none; border-color: #ff1a75; box-shadow: 0 0 0 3px rgba(255,26,117,0.18); }
    input[readonly] { background: #f3f4f6; color: #6b7280; cursor: default; }
    .help-text { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .help-text a { color: #ff1a75; text-decoration: none; }
    .help-text a:hover { text-decoration: underline; }
    button { width: 100%; padding: 13px 24px; background: #15171a; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
    button:hover { background: #ff1a75; }
    .footer { text-align: center; margin-top: 22px; font-size: 12px; color: #9ca3af; }
    .footer a { color: #15171a; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Ghost<span>·</span></div>
    <h1>Connect to your Ghost site</h1>
    <p class="subtitle">${isLocked ? "Enter your Staff Access Token to let Claude work with this Ghost site." : "Enter your site URL and a Staff Access Token to let Claude work with your blog."}</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    ${isLocked ? `<div class="notice-lock">&#128274; This server is restricted to <strong>${escapeHtml(ghostUrlLock!)}</strong>. The Ghost site URL cannot be changed.</div>` : ""}
    <div class="notice">
      <strong>Your credentials are not stored on this server.</strong> They are encrypted into the OAuth code and held by your MCP client (Claude Desktop, claude.ai, etc.).
    </div>
    <form method="POST" action="/authorize">
      <input type="hidden" name="redirectUri" value="${escapeHtml(redirectUri ?? "")}">
      <input type="hidden" name="state" value="${escapeHtml(state ?? "")}">
      <input type="hidden" name="codeChallenge" value="${escapeHtml(codeChallenge ?? "")}">
      <input type="hidden" name="codeChallengeMethod" value="${escapeHtml(codeChallengeMethod ?? "S256")}">

      <div class="form-group">
        <label for="ghostUrl">Ghost site URL${isLocked ? "" : " *"}</label>
        <input type="url" id="ghostUrl" name="ghostUrl"${isLocked ? " readonly" : " required"} value="${escapeHtml(ghostUrl ?? "")}" placeholder="https://my-blog.ghost.io" autocomplete="url">
        <p class="help-text">${isLocked ? "Pre-configured by the server administrator." : "The public URL of your Ghost site. No trailing slash."}</p>
      </div>

      <div class="form-group">
        <label for="staffAccessToken">Staff Access Token</label>
        <input type="password" id="staffAccessToken" name="staffAccessToken" placeholder="id:hex-secret" autocomplete="off">
        <p class="help-text">Create in <a href="#" target="_blank" rel="noopener">Ghost Admin → Settings → Integrations → Add custom integration</a>. Required for read/write of admin resources.</p>
      </div>

      <div class="form-group">
        <label for="contentApiKey">Content API key <em style="color:#9ca3af">— optional</em></label>
        <input type="text" id="contentApiKey" name="contentApiKey" placeholder="26-character hex key" autocomplete="off" autocapitalize="off">
        <p class="help-text">Only needed to browse public-facing authors via the Content API.</p>
      </div>

      <button type="submit">Connect to Ghost</button>
    </form>
    <p class="footer">Powered by <a href="https://github.com/ikko-dev/ghost-tools" target="_blank" rel="noopener">ghost-tools</a></p>
  </div>
</body>
</html>`;
}

function renderSuccessPage(redirectUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="2;url=${escapeHtml(redirectUrl)}">
  <title>Connected — Ghost MCP</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: linear-gradient(135deg, #15171a 0%, #2c2f33 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: white; border-radius: 16px; padding: 40px; text-align: center; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .check { width: 64px; height: 64px; margin: 0 auto 20px; background: linear-gradient(135deg,#10b981,#059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; }
    h1 { color: #15171a; font-size: 22px; margin-bottom: 8px; }
    .message { color: #666; font-size: 14px; margin-bottom: 20px; }
    a { color: #ff1a75; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="check">✓</div>
    <h1>Successfully Connected!</h1>
    <p class="message">Your Ghost credentials are encrypted and on their way back to your MCP client.</p>
    <a href="${escapeHtml(redirectUrl)}">Click here if not redirected automatically</a>
  </div>
  <script>setTimeout(function(){ window.location.href = ${JSON.stringify(redirectUrl)}; }, 2000);</script>
</body>
</html>`;
}

function renderErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Error — Ghost MCP</title>
<style>body{font-family:sans-serif;background:#f3f4f6;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.box{background:white;border-radius:16px;padding:40px;max-width:400px;text-align:center}h1{color:#dc2626}</style>
</head><body><div class="box"><h1>Error</h1><p>${escapeHtml(message)}</p></div></body></html>`;
}

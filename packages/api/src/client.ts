import type { AdminCredentials, ContentCredentials, GhostOptions } from "./types.ts";

import { extractGhostErrorMessage, GhostApiError } from "./errors.ts";
import { signAdminJwt } from "./jwt.ts";

const DEFAULT_ACCEPT_VERSION = "v5.0";

/**
 * Low-level HTTP client for Ghost.
 *
 * Authenticates either as Admin (with a staff access token, signing a JWT)
 * or as Content (with the content API key passed as `?key=...`).
 *
 * Used internally by the SDK and core executors — not intended for direct use.
 */
export class GhostHttpClient {
  private readonly url: string;
  private readonly acceptVersion: string;
  private readonly fetch: typeof globalThis.fetch;
  private readonly admin?: AdminCredentials;
  private readonly content?: ContentCredentials;

  constructor(
    credentials: { admin?: AdminCredentials; content?: ContentCredentials },
    options?: GhostOptions,
  ) {
    if (!credentials.admin && !credentials.content) {
      throw new Error("GhostHttpClient requires either admin or content credentials.");
    }

    // url is taken from whichever credential set is provided; admin wins if both
    const url = credentials.admin?.url ?? credentials.content?.url;
    /* v8 ignore next 3 */
    if (!url) {
      throw new Error("GhostHttpClient requires a Ghost site URL.");
    }
    this.url = url.replace(/\/$/, "");
    this.acceptVersion = options?.acceptVersion ?? DEFAULT_ACCEPT_VERSION;
    this.fetch = options?.fetch ?? globalThis.fetch;
    this.admin = credentials.admin;
    this.content = credentials.content;
  }

  /**
   * Admin API request — signs a fresh JWT for each call.
   */
  async admin_<T = unknown>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    if (!this.admin) {
      throw new Error("Admin API call attempted but no admin credentials configured.");
    }
    const url = this.buildUrl(`/ghost/api/admin${path}`, query);
    const jwt = signAdminJwt(this.admin.staffAccessToken);
    return this.request<T>(method, url, body, {
      Authorization: `Ghost ${jwt}`,
      "Accept-Version": this.acceptVersion,
    });
  }

  /**
   * Content API request — appends `?key=...` query param.
   */
  async content_<T = unknown>(
    method: "GET",
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    if (!this.content) {
      throw new Error("Content API call attempted but no content credentials configured.");
    }
    const url = this.buildUrl(`/ghost/api/content${path}`, {
      ...query,
      key: this.content.contentApiKey,
    });
    return this.request<T>(method, url, undefined, {
      "Accept-Version": this.acceptVersion,
    });
  }

  /**
   * Upload a file using multipart/form-data (Admin API only).
   * Used by `/images/upload/` and `/themes/upload/`.
   */
  async uploadAdmin<T = unknown>(
    path: string,
    file: Blob,
    filename: string,
    fields?: Record<string, string>,
  ): Promise<T> {
    /* v8 ignore start */
    if (!this.admin) {
      throw new Error("Admin upload attempted but no admin credentials configured.");
    }
    /* v8 ignore stop */
    const formData = new FormData();
    formData.append("file", file, filename);
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
    }
    const url = this.buildUrl(`/ghost/api/admin${path}`);
    const jwt = signAdminJwt(this.admin.staffAccessToken);

    const response = await this.fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Ghost ${jwt}`,
        "Accept-Version": this.acceptVersion,
      },
      body: formData,
    });

    return this.handleResponse<T>(response, url);
  }

  /**
   * Build a fully-qualified URL with query parameters.
   */
  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    // Ghost paths must end in a slash (before query string)
    const withTrailingSlash =
      normalized.endsWith("/") || normalized.includes("?") ? normalized : `${normalized}/`;
    const full = `${this.url}${withTrailingSlash}`;

    if (!query) return full;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    const qs = params.toString();
    return qs ? `${full}?${qs}` : full;
  }

  private async request<T>(
    method: HttpMethod,
    url: string,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<T> {
    const finalHeaders: Record<string, string> = {
      Accept: "application/json",
      ...headers,
    };
    if (body !== undefined) {
      finalHeaders["Content-Type"] = "application/json";
    }
    const response = await this.fetch(url, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response, url);
  }

  private async handleResponse<T>(response: Response, url: string): Promise<T> {
    if (!response.ok) {
      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = await response.text().catch(() => null);
      }
      const { message, errors } = extractGhostErrorMessage(response.status, responseBody);
      throw new GhostApiError({
        status: response.status,
        message,
        url,
        body: responseBody,
        errors,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as T;
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Error thrown by the Ghost API client.
 *
 * Ghost returns errors in the shape:
 *   { errors: [{ message, context, code, type, ... }] }
 */
export class GhostApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: unknown;
  readonly errors: GhostErrorDetail[];

  constructor(options: {
    status: number;
    message: string;
    url: string;
    body?: unknown;
    errors?: GhostErrorDetail[];
  }) {
    super(options.message);
    this.name = "GhostApiError";
    this.status = options.status;
    this.url = options.url;
    this.body = options.body;
    this.errors = options.errors ?? [];
  }

  get statusText(): string {
    switch (this.status) {
      case 401:
        return "Invalid credentials";
      case 403:
        return "Insufficient permissions";
      case 404:
        return "Resource not found";
      case 409:
        return "Conflict";
      case 422:
        return "Validation error";
      case 429:
        return "Rate limit exceeded";
      case 500:
        return "Ghost server error";
      default:
        return `HTTP ${this.status}`;
    }
  }
}

export interface GhostErrorDetail {
  message: string;
  context?: string | null;
  type?: string;
  code?: string;
  property?: string;
  details?: unknown;
}

export function isGhostApiError(error: unknown): error is GhostApiError {
  return error instanceof GhostApiError;
}

/**
 * Pull a useful message out of a Ghost error response body.
 */
export function extractGhostErrorMessage(
  status: number,
  body: unknown,
): {
  message: string;
  errors: GhostErrorDetail[];
} {
  if (body !== null && typeof body === "object" && "errors" in body) {
    const errs = (body as { errors: unknown }).errors;
    if (Array.isArray(errs) && errs.length > 0) {
      const errors = errs as GhostErrorDetail[];
      const first = errors[0];
      const parts = [first.message, first.context].filter(Boolean);
      return { message: parts.join(" — "), errors };
    }
  }

  switch (status) {
    case 401:
      return {
        message: "Invalid credentials. Check your Ghost URL and staff access token.",
        errors: [],
      };
    case 403:
      return { message: "Insufficient permissions for this resource.", errors: [] };
    case 404:
      return { message: "Resource not found.", errors: [] };
    case 422:
      return { message: "Validation error.", errors: [] };
    case 429:
      return { message: "Rate limit exceeded. Please retry later.", errors: [] };
    case 500:
      return { message: "Ghost server error. Please try again later.", errors: [] };
    default:
      return { message: `Ghost API error (HTTP ${status})`, errors: [] };
  }
}

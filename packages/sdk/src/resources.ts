/**
 * Fluent resource builders.
 *
 * Each builder wraps a single HTTP path and exposes browse/read/add/edit/delete
 * methods. The builders themselves are stateless — they take the client by
 * reference and the path/key by closure.
 */

import type { BrowseParams, GhostHttpClient, Meta, ReadParams } from "@ikko-dev/ghost-api";
import { unwrapMany, unwrapOne, wrapForWrite } from "@ikko-dev/ghost-api";

type Q = Record<string, string | number | undefined>;

function browseToQuery(params: BrowseParams): Q {
  return {
    filter: params.filter,
    include: params.include,
    fields: params.fields,
    formats: params.formats,
    limit: params.limit === undefined ? undefined : String(params.limit),
    page: params.page,
    order: params.order,
  };
}

function readToQuery(params: ReadParams): Q {
  return { include: params.include, fields: params.fields, formats: params.formats };
}

export class AdminResource<T> {
  constructor(
    private readonly client: GhostHttpClient,
    private readonly key: string,
    private readonly basePath: string,
  ) {}

  async browse(params: BrowseParams = {}): Promise<{ items: T[]; meta?: Meta }> {
    const res = await this.client.admin_<Record<string, unknown>>(
      "GET",
      this.basePath,
      undefined,
      browseToQuery(params),
    );
    return { items: unwrapMany<T>(res, this.key), meta: res.meta as Meta | undefined };
  }

  async read(id: string, params: ReadParams = {}): Promise<T | undefined> {
    const res = await this.client.admin_<Record<string, unknown>>(
      "GET",
      `${this.basePath}/${encodeURIComponent(id)}`,
      undefined,
      readToQuery(params),
    );
    return unwrapOne<T>(res, this.key);
  }

  async readBySlug(slug: string, params: ReadParams = {}): Promise<T | undefined> {
    const res = await this.client.admin_<Record<string, unknown>>(
      "GET",
      `${this.basePath}/slug/${encodeURIComponent(slug)}`,
      undefined,
      readToQuery(params),
    );
    return unwrapOne<T>(res, this.key);
  }

  async add(payload: Partial<T>): Promise<T | undefined> {
    const res = await this.client.admin_<Record<string, unknown>>(
      "POST",
      this.basePath,
      wrapForWrite(this.key, payload),
    );
    return unwrapOne<T>(res, this.key);
  }

  async edit(id: string, payload: Partial<T>): Promise<T | undefined> {
    const res = await this.client.admin_<Record<string, unknown>>(
      "PUT",
      `${this.basePath}/${encodeURIComponent(id)}`,
      wrapForWrite(this.key, payload),
    );
    return unwrapOne<T>(res, this.key);
  }

  async delete(id: string): Promise<void> {
    await this.client.admin_<void>("DELETE", `${this.basePath}/${encodeURIComponent(id)}`);
  }
}

export class CopyableResource<T> extends AdminResource<T> {
  async copy(id: string): Promise<T | undefined> {
    const res = await (
      this as unknown as {
        client: GhostHttpClient;
        key: string;
        basePath: string;
      }
    ).client.admin_<Record<string, unknown>>(
      "POST",
      `${(this as unknown as { basePath: string }).basePath}/${encodeURIComponent(id)}/copy`,
    );
    return unwrapOne<T>(res, (this as unknown as { key: string }).key);
  }
}

export class ContentResource<T> {
  constructor(
    private readonly client: GhostHttpClient,
    private readonly key: string,
    private readonly basePath: string,
  ) {}

  async browse(params: BrowseParams = {}): Promise<{ items: T[]; meta?: Meta }> {
    const res = await this.client.content_<Record<string, unknown>>(
      "GET",
      this.basePath,
      browseToQuery(params),
    );
    return { items: unwrapMany<T>(res, this.key), meta: res.meta as Meta | undefined };
  }

  async read(id: string, params: ReadParams = {}): Promise<T | undefined> {
    const res = await this.client.content_<Record<string, unknown>>(
      "GET",
      `${this.basePath}/${encodeURIComponent(id)}`,
      readToQuery(params),
    );
    return unwrapOne<T>(res, this.key);
  }

  async readBySlug(slug: string, params: ReadParams = {}): Promise<T | undefined> {
    const res = await this.client.content_<Record<string, unknown>>(
      "GET",
      `${this.basePath}/slug/${encodeURIComponent(slug)}`,
      readToQuery(params),
    );
    return unwrapOne<T>(res, this.key);
  }
}

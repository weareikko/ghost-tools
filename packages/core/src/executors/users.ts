import type { Role, User } from "@ikko-dev/ghost-api";
import { unwrapMany, unwrapOne, wrapForWrite } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";
import { ROUTES, request } from "../routes.ts";
import type { BrowseOptions, ReadOptions } from "./types.ts";
import { browseQuery, readQuery } from "./types.ts";

interface UsersEnvelope {
  users: User[];
  meta?: { pagination?: unknown };
}
interface RolesEnvelope {
  roles: Role[];
}

export async function browseUsers(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ users: User[]; meta?: unknown }>> {
  const response = await request<UsersEnvelope>(
    ROUTES.users.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { users: unwrapMany<User>(response, "users"), meta: response.meta } };
}

export async function readUser(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<User | undefined>> {
  if (!options.slug && !options.id) {
    throw new Error("readUser requires id or slug.");
  }
  const route = options.slug ? ROUTES.users.readBySlug : ROUTES.users.read;
  const params = options.slug ? { slug: options.slug } : { id: options.id ?? "" };
  const response = await request<UsersEnvelope>(route, ctx, params, {
    query: readQuery(options),
  });
  return { data: unwrapOne<User>(response, "users") };
}

export interface EditUserOptions extends Partial<User> {
  id: string;
}

export async function editUser(
  options: EditUserOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<User | undefined>> {
  const { id, ...body } = options;
  const response = await request<UsersEnvelope>(
    ROUTES.users.edit,
    ctx,
    { id },
    {
      body: wrapForWrite("users", body),
    },
  );
  return { data: unwrapOne<User>(response, "users") };
}

export async function deleteUser(
  options: { id: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<void>> {
  await request<void>(ROUTES.users.delete, ctx, { id: options.id });
  return { data: undefined };
}

export async function browseRoles(
  _options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Role[]>> {
  const response = await request<RolesEnvelope>(ROUTES.roles.browse, ctx);
  return { data: unwrapMany<Role>(response, "roles") };
}

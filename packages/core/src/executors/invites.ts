import { unwrapMany, unwrapOne, wrapForWrite } from '@ikko-dev/ghost-api';

import type { ExecutorContext, ExecutorResult } from '../context.ts';
import { ROUTES, request } from '../routes.ts';
import type { BrowseOptions, ReadOptions } from './types.ts';
import { browseQuery, readQuery } from './types.ts';

export interface Invite {
  id: string;
  role_id?: string;
  email: string;
  expires?: number;
  created_at?: string;
  updated_at?: string;
  status?: string;
  [key: string]: unknown;
}

interface InvitesEnvelope {
  invites: Invite[];
  meta?: { pagination?: unknown };
}

export async function browseInvites(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ invites: Invite[]; meta?: unknown }>> {
  const response = await request<InvitesEnvelope>(ROUTES.invites.browse, ctx, {}, {
    query: browseQuery(options),
  });
  return { data: { invites: unwrapMany<Invite>(response, 'invites'), meta: response.meta } };
}

export async function readInvite(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Invite | undefined>> {
  if (!options.id) throw new Error('readInvite requires id.');
  const response = await request<InvitesEnvelope>(ROUTES.invites.read, ctx, { id: options.id }, {
    query: readQuery(options),
  });
  return { data: unwrapOne<Invite>(response, 'invites') };
}

export interface AddInviteOptions {
  email: string;
  role_id?: string;
}

export async function addInvite(
  options: AddInviteOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Invite | undefined>> {
  const response = await request<InvitesEnvelope>(ROUTES.invites.add, ctx, {}, {
    body: wrapForWrite('invites', options),
  });
  return { data: unwrapOne<Invite>(response, 'invites') };
}

export async function deleteInvite(
  options: { id: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<void>> {
  await request<void>(ROUTES.invites.delete, ctx, { id: options.id });
  return { data: undefined };
}

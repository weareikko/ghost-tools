import type { Member } from "@ikko-dev/ghost-api";
import { unwrapMany, unwrapOne, wrapForWrite } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";
import { ROUTES, request } from "../routes.ts";
import type { BrowseOptions, ReadOptions } from "./types.ts";
import { browseQuery, readQuery } from "./types.ts";

interface MembersEnvelope {
  members: Member[];
  meta?: { pagination?: unknown };
}

export async function browseMembers(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ members: Member[]; meta?: unknown }>> {
  const response = await request<MembersEnvelope>(
    ROUTES.members.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { members: unwrapMany<Member>(response, "members"), meta: response.meta } };
}

export async function readMember(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Member | undefined>> {
  if (!options.id) {
    throw new Error("readMember requires id.");
  }
  const response = await request<MembersEnvelope>(
    ROUTES.members.read,
    ctx,
    { id: options.id },
    {
      query: readQuery(options),
    },
  );
  return { data: unwrapOne<Member>(response, "members") };
}

export interface AddMemberOptions extends Partial<Member> {
  email: string;
}

export async function addMember(
  options: AddMemberOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Member | undefined>> {
  const response = await request<MembersEnvelope>(
    ROUTES.members.add,
    ctx,
    {},
    {
      body: wrapForWrite("members", options),
    },
  );
  return { data: unwrapOne<Member>(response, "members") };
}

export interface EditMemberOptions extends Partial<Member> {
  id: string;
}

export async function editMember(
  options: EditMemberOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Member | undefined>> {
  const { id, ...body } = options;
  const response = await request<MembersEnvelope>(
    ROUTES.members.edit,
    ctx,
    { id },
    {
      body: wrapForWrite("members", body),
    },
  );
  return { data: unwrapOne<Member>(response, "members") };
}

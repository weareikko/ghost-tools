import type { Webhook } from "@ikko-dev/ghost-api";
import { unwrapOne, wrapForWrite } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";
import { ROUTES, request } from "../routes.ts";

interface WebhooksEnvelope {
  webhooks: Webhook[];
}

export interface AddWebhookOptions extends Partial<Webhook> {
  event: string;
  target_url: string;
}

export async function addWebhook(
  options: AddWebhookOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Webhook | undefined>> {
  const response = await request<WebhooksEnvelope>(
    ROUTES.webhooks.add,
    ctx,
    {},
    {
      body: wrapForWrite("webhooks", options),
    },
  );
  return { data: unwrapOne<Webhook>(response, "webhooks") };
}

export interface EditWebhookOptions extends Partial<Webhook> {
  id: string;
}

export async function editWebhook(
  options: EditWebhookOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Webhook | undefined>> {
  const { id, ...body } = options;
  const response = await request<WebhooksEnvelope>(
    ROUTES.webhooks.edit,
    ctx,
    { id },
    {
      body: wrapForWrite("webhooks", body),
    },
  );
  return { data: unwrapOne<Webhook>(response, "webhooks") };
}

export async function deleteWebhook(
  options: { id: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<void>> {
  await request<void>(ROUTES.webhooks.delete, ctx, { id: options.id });
  return { data: undefined };
}

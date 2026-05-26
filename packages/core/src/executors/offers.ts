import type { Offer } from "@ikko-dev/ghost-api";
import { unwrapMany, unwrapOne, wrapForWrite } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";
import { ROUTES, request } from "../routes.ts";
import type { BrowseOptions, ReadOptions } from "./types.ts";
import { browseQuery, readQuery } from "./types.ts";

interface OffersEnvelope {
  offers: Offer[];
  meta?: { pagination?: unknown };
}

export async function browseOffers(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ offers: Offer[]; meta?: unknown }>> {
  const response = await request<OffersEnvelope>(
    ROUTES.offers.browse,
    ctx,
    {},
    {
      query: browseQuery(options),
    },
  );
  return { data: { offers: unwrapMany<Offer>(response, "offers"), meta: response.meta } };
}

export async function readOffer(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Offer | undefined>> {
  if (!options.id) throw new Error("readOffer requires id.");
  const response = await request<OffersEnvelope>(
    ROUTES.offers.read,
    ctx,
    { id: options.id },
    {
      query: readQuery(options),
    },
  );
  return { data: unwrapOne<Offer>(response, "offers") };
}

export interface AddOfferOptions extends Partial<Offer> {
  name: string;
  code: string;
  type: "percent" | "fixed" | "trial";
  cadence: "month" | "year";
  amount: number;
  duration: "once" | "forever" | "repeating" | "trial";
  tier: { id: string };
}

export async function addOffer(
  options: AddOfferOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Offer | undefined>> {
  const response = await request<OffersEnvelope>(
    ROUTES.offers.add,
    ctx,
    {},
    {
      body: wrapForWrite("offers", options),
    },
  );
  return { data: unwrapOne<Offer>(response, "offers") };
}

export interface EditOfferOptions extends Partial<Offer> {
  id: string;
}

export async function editOffer(
  options: EditOfferOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Offer | undefined>> {
  const { id, ...body } = options;
  const response = await request<OffersEnvelope>(
    ROUTES.offers.edit,
    ctx,
    { id },
    {
      body: wrapForWrite("offers", body),
    },
  );
  return { data: unwrapOne<Offer>(response, "offers") };
}

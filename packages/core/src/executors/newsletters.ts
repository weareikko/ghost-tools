import type { Newsletter } from '@ikko-dev/ghost-api';
import { unwrapMany, unwrapOne, wrapForWrite } from '@ikko-dev/ghost-api';

import type { ExecutorContext, ExecutorResult } from '../context.ts';
import { ROUTES, request } from '../routes.ts';
import type { BrowseOptions, ReadOptions } from './types.ts';
import { browseQuery, readQuery } from './types.ts';

interface NewslettersEnvelope {
  newsletters: Newsletter[];
  meta?: { pagination?: unknown };
}

export async function browseNewsletters(
  options: BrowseOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<{ newsletters: Newsletter[]; meta?: unknown }>> {
  const response = await request<NewslettersEnvelope>(ROUTES.newsletters.browse, ctx, {}, {
    query: browseQuery(options),
  });
  return { data: { newsletters: unwrapMany<Newsletter>(response, 'newsletters'), meta: response.meta } };
}

export async function readNewsletter(
  options: ReadOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Newsletter | undefined>> {
  if (!options.id) throw new Error('readNewsletter requires id.');
  const response = await request<NewslettersEnvelope>(ROUTES.newsletters.read, ctx, { id: options.id }, {
    query: readQuery(options),
  });
  return { data: unwrapOne<Newsletter>(response, 'newsletters') };
}

export interface AddNewsletterOptions extends Partial<Newsletter> {
  name: string;
}

export async function addNewsletter(
  options: AddNewsletterOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Newsletter | undefined>> {
  const response = await request<NewslettersEnvelope>(ROUTES.newsletters.add, ctx, {}, {
    body: wrapForWrite('newsletters', options),
  });
  return { data: unwrapOne<Newsletter>(response, 'newsletters') };
}

export interface EditNewsletterOptions extends Partial<Newsletter> {
  id: string;
}

export async function editNewsletter(
  options: EditNewsletterOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Newsletter | undefined>> {
  const { id, ...body } = options;
  const response = await request<NewslettersEnvelope>(ROUTES.newsletters.edit, ctx, { id }, {
    body: wrapForWrite('newsletters', body),
  });
  return { data: unwrapOne<Newsletter>(response, 'newsletters') };
}

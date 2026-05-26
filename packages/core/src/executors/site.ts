import type { SiteInfo } from '@ikko-dev/ghost-api';

import type { ExecutorContext, ExecutorResult } from '../context.ts';
import { ROUTES, request } from '../routes.ts';

interface SiteEnvelope {
  site: SiteInfo;
}

export async function readSite(
  _options: Record<string, never>,
  ctx: ExecutorContext,
): Promise<ExecutorResult<SiteInfo>> {
  const response = await request<SiteEnvelope>(ROUTES.site.read, ctx);
  return { data: response.site };
}

import type { ExecutorContext, ExecutorResult } from '../context.ts';
import { ROUTES, request } from '../routes.ts';

export interface SettingEntry {
  key: string;
  value: unknown;
  group?: string;
  type?: string;
  [key: string]: unknown;
}

interface SettingsEnvelope {
  settings: SettingEntry[];
  meta?: unknown;
}

export async function readSettings(
  _options: Record<string, never>,
  ctx: ExecutorContext,
): Promise<ExecutorResult<SettingEntry[]>> {
  const response = await request<SettingsEnvelope>(ROUTES.settings.read, ctx);
  return { data: response.settings };
}

export interface EditSettingsOptions {
  settings: { key: string; value: unknown }[];
}

export async function editSettings(
  options: EditSettingsOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<SettingEntry[]>> {
  const response = await request<SettingsEnvelope>(ROUTES.settings.edit, ctx, {}, {
    body: { settings: options.settings },
  });
  return { data: response.settings };
}

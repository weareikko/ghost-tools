import { unwrapOne } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";
import { ROUTES, request } from "../routes.ts";

export interface Theme {
  name: string;
  package?: { name: string; version: string };
  active: boolean;
  [key: string]: unknown;
}

interface ThemesEnvelope {
  themes: Theme[];
}

export interface UploadThemeOptions {
  /** Zip file contents. */
  file: Blob;
  /** Filename (typically `<theme>.zip`). */
  filename: string;
}

export async function uploadTheme(
  options: UploadThemeOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<Theme | undefined>> {
  const response = await ctx.client.uploadAdmin<ThemesEnvelope>(
    "/themes/upload",
    options.file,
    options.filename,
  );
  return { data: unwrapOne<Theme>(response, "themes") };
}

export async function activateTheme(
  options: { name: string },
  ctx: ExecutorContext,
): Promise<ExecutorResult<Theme | undefined>> {
  const response = await request<ThemesEnvelope>(ROUTES.themes.activate, ctx, {
    name: options.name,
  });
  return { data: unwrapOne<Theme>(response, "themes") };
}

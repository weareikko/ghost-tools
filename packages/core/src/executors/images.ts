import type { UploadedImage } from "@ikko-dev/ghost-api";

import type { ExecutorContext, ExecutorResult } from "../context.ts";

interface ImagesEnvelope {
  images: UploadedImage[];
}

export interface UploadImageOptions {
  /** Image bytes (Blob or any BlobLike Node Buffer-derived value). */
  file: Blob;
  /** Original filename including extension. */
  filename: string;
  /** Purpose hint — Ghost uses this for resize defaults. */
  purpose?: "image" | "profile_image" | "icon";
  /** Optional original reference for resizing. */
  ref?: string;
}

/**
 * Upload an image to Ghost's CDN.
 *
 * Returns the URL of the uploaded image.
 */
export async function uploadImage(
  options: UploadImageOptions,
  ctx: ExecutorContext,
): Promise<ExecutorResult<UploadedImage | undefined>> {
  const fields: Record<string, string> = {};
  if (options.purpose) fields.purpose = options.purpose;
  if (options.ref) fields.ref = options.ref;

  const response = await ctx.client.uploadAdmin<ImagesEnvelope>(
    "/images/upload",
    options.file,
    options.filename,
    fields,
  );

  return { data: response.images?.[0] };
}

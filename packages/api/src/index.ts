// @ikko-dev/ghost-api — Ghost CMS API client

export { GhostHttpClient } from './client.ts';
export type { HttpMethod } from './client.ts';
export { signAdminJwt } from './jwt.ts';
export type { AdminJwtOptions } from './jwt.ts';
export {
  GhostApiError,
  isGhostApiError,
  extractGhostErrorMessage,
} from './errors.ts';
export type { GhostErrorDetail } from './errors.ts';
export {
  createConfigStore,
  deleteConfig,
  getContentApiKey,
  getStaffAccessToken,
  getUrl,
  setContentApiKey,
  setStaffAccessToken,
  setUrl,
} from './config.ts';
export { ConfigStore } from './utils/config-store.ts';
export type { ConfigStoreFs } from './utils/config-store.ts';
export { extractMeta, unwrapMany, unwrapOne, wrapForWrite } from './envelope.ts';

export type {
  AdminCredentials,
  BrowseParams,
  ContentCredentials,
  GhostConfig,
  GhostEnvelope,
  GhostOptions,
  Meta,
  Pagination,
  ReadParams,
} from './types.ts';

export type {
  Author,
  Member,
  Newsletter,
  Offer,
  Page,
  Post,
  Role,
  SiteInfo,
  Tag,
  Tier,
  UploadedImage,
  User,
  Webhook,
} from './resources.ts';

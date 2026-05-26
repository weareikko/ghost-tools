// @ikko-dev/ghost-sdk
// Fluent TypeScript SDK for Ghost CMS

export { Ghost } from "./ghost.ts";
export { AdminResource, ContentResource, CopyableResource } from "./resources.ts";
export { paginate } from "./pagination.ts";

// Re-export commonly used types
export type {
  AdminCredentials,
  Author,
  BrowseParams,
  ContentCredentials,
  GhostOptions,
  Member,
  Meta,
  Newsletter,
  Offer,
  Page,
  Pagination,
  Post,
  ReadParams,
  Role,
  SiteInfo,
  Tag,
  Tier,
  UploadedImage,
  User,
  Webhook,
} from "@ikko-dev/ghost-api";
export { GhostApiError, isGhostApiError } from "@ikko-dev/ghost-api";

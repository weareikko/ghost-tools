import type {
  AdminCredentials,
  Author,
  ContentCredentials,
  GhostOptions,
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
} from "@ikko-dev/ghost-api";

import { GhostHttpClient, unwrapOne } from "@ikko-dev/ghost-api";

import { AdminResource, ContentResource, CopyableResource } from "./resources.ts";

/**
 * Fluent TypeScript client for Ghost.
 *
 * Construct with admin credentials, content credentials, or both. Resources
 * automatically pick the right API.
 *
 * ```ts
 * const ghost = new Ghost({
 *   admin: { url: 'https://my-blog.ghost.io', staffAccessToken: 'id:hex' },
 * });
 * const { items } = await ghost.posts.browse({ limit: 10 });
 * ```
 */
export class Ghost {
  readonly client: GhostHttpClient;

  // Admin resources
  readonly posts: CopyableResource<Post>;
  readonly pages: CopyableResource<Page>;
  readonly tags: AdminResource<Tag>;
  readonly members: AdminResource<Member>;
  readonly tiers: AdminResource<Tier>;
  readonly newsletters: AdminResource<Newsletter>;
  readonly offers: AdminResource<Offer>;
  readonly users: AdminResource<User>;
  readonly webhooks: AdminResource<Webhook>;

  // Content resources
  readonly contentPosts: ContentResource<Post>;
  readonly contentPages: ContentResource<Page>;
  readonly contentTags: ContentResource<Tag>;
  readonly contentTiers: ContentResource<Tier>;
  readonly authors: ContentResource<Author>;

  constructor(
    credentials: { admin?: AdminCredentials; content?: ContentCredentials },
    options?: GhostOptions,
  ) {
    this.client = new GhostHttpClient(credentials, options);

    this.posts = new CopyableResource<Post>(this.client, "posts", "/posts");
    this.pages = new CopyableResource<Page>(this.client, "pages", "/pages");
    this.tags = new AdminResource<Tag>(this.client, "tags", "/tags");
    this.members = new AdminResource<Member>(this.client, "members", "/members");
    this.tiers = new AdminResource<Tier>(this.client, "tiers", "/tiers");
    this.newsletters = new AdminResource<Newsletter>(this.client, "newsletters", "/newsletters");
    this.offers = new AdminResource<Offer>(this.client, "offers", "/offers");
    this.users = new AdminResource<User>(this.client, "users", "/users");
    this.webhooks = new AdminResource<Webhook>(this.client, "webhooks", "/webhooks");

    this.contentPosts = new ContentResource<Post>(this.client, "posts", "/posts");
    this.contentPages = new ContentResource<Page>(this.client, "pages", "/pages");
    this.contentTags = new ContentResource<Tag>(this.client, "tags", "/tags");
    this.contentTiers = new ContentResource<Tier>(this.client, "tiers", "/tiers");
    this.authors = new ContentResource<Author>(this.client, "authors", "/authors");
  }

  /**
   * Read site info (title, description, version, etc.)
   */
  async site(): Promise<SiteInfo> {
    const res = await this.client.admin_<{ site: SiteInfo }>("GET", "/site");
    return res.site;
  }

  /**
   * Browse all roles assignable to users.
   */
  async roles(): Promise<Role[]> {
    const res = await this.client.admin_<{ roles: Role[] }>("GET", "/roles");
    return res.roles;
  }

  /**
   * Upload an image to the Ghost CDN.
   */
  async uploadImage(
    file: Blob,
    filename: string,
    purpose?: "image" | "profile_image" | "icon",
  ): Promise<UploadedImage | undefined> {
    const fields = purpose ? { purpose } : undefined;
    const res = await this.client.uploadAdmin<{ images: UploadedImage[] }>(
      "/images/upload",
      file,
      filename,
      fields,
    );
    return unwrapOne<UploadedImage>(res as unknown as { images: UploadedImage[] }, "images");
  }
}

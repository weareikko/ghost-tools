/**
 * Ghost resource type definitions.
 *
 * Only fields commonly used in practice are typed; Ghost APIs return additional
 * fields we don't model — they're preserved via `[key: string]: unknown` on the
 * base interface.
 */

interface BaseGhostResource {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Post extends BaseGhostResource {
  uuid?: string;
  title: string;
  slug?: string;
  mobiledoc?: string | null;
  lexical?: string | null;
  html?: string;
  plaintext?: string;
  status?: "draft" | "published" | "scheduled" | "sent";
  visibility?: "public" | "members" | "paid" | "tiers";
  feature_image?: string | null;
  feature_image_alt?: string | null;
  feature_image_caption?: string | null;
  featured?: boolean;
  custom_excerpt?: string | null;
  excerpt?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  email_subject?: string | null;
  published_at?: string | null;
  url?: string;
  tags?: Tag[];
  authors?: User[];
  primary_author?: User;
  primary_tag?: Tag;
  email?: { id: string; html?: string } | null;
  newsletter?: { id: string } | null;
  [key: string]: unknown;
}

export type Page = Post;

export interface Tag extends BaseGhostResource {
  name: string;
  slug?: string;
  description?: string | null;
  feature_image?: string | null;
  visibility?: "public" | "internal";
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  canonical_url?: string | null;
  accent_color?: string | null;
  url?: string;
  [key: string]: unknown;
}

export interface User extends BaseGhostResource {
  name: string;
  slug?: string;
  email?: string;
  profile_image?: string | null;
  cover_image?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  status?: string;
  url?: string;
  roles?: Role[];
  [key: string]: unknown;
}

export type Author = User;

export interface Role extends BaseGhostResource {
  name: string;
  description?: string;
}

export interface Member extends BaseGhostResource {
  uuid?: string;
  email: string;
  name?: string | null;
  note?: string | null;
  subscribed?: boolean;
  email_count?: number;
  email_opened_count?: number;
  email_open_rate?: number | null;
  status?: "free" | "paid" | "comped";
  labels?: { id: string; name: string; slug?: string }[];
  tiers?: Tier[];
  newsletters?: Newsletter[];
  [key: string]: unknown;
}

export interface Tier extends BaseGhostResource {
  name: string;
  slug?: string;
  active?: boolean;
  description?: string | null;
  type?: "free" | "paid";
  welcome_page_url?: string | null;
  visibility?: "public" | "none";
  trial_days?: number;
  monthly_price?: number | null;
  yearly_price?: number | null;
  currency?: string;
  benefits?: string[];
  [key: string]: unknown;
}

export interface Newsletter extends BaseGhostResource {
  name: string;
  slug?: string;
  description?: string | null;
  status?: "active" | "archived";
  visibility?: "members" | "paid";
  sender_name?: string | null;
  sender_email?: string | null;
  sender_reply_to?: string;
  subscribe_on_signup?: boolean;
  sort_order?: number;
  [key: string]: unknown;
}

export interface Offer extends BaseGhostResource {
  name: string;
  code: string;
  display_title?: string;
  display_description?: string;
  type: "percent" | "fixed" | "trial";
  cadence: "month" | "year";
  amount: number;
  duration: "once" | "forever" | "repeating" | "trial";
  duration_in_months?: number | null;
  currency_restriction?: boolean;
  currency?: string | null;
  status?: "active" | "archived";
  redemption_count?: number;
  tier: { id: string; name?: string };
  [key: string]: unknown;
}

export interface Webhook extends BaseGhostResource {
  event: string;
  target_url: string;
  name?: string;
  secret?: string | null;
  api_version?: string;
  integration_id?: string;
  status?: "available" | "unavailable";
  last_triggered_at?: string | null;
  last_triggered_status?: string | null;
  last_triggered_error?: string | null;
  [key: string]: unknown;
}

export interface SiteInfo {
  title: string;
  description: string;
  logo: string | null;
  icon: string | null;
  accent_color?: string;
  cover_image: string | null;
  facebook?: string | null;
  twitter?: string | null;
  lang?: string;
  timezone?: string;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  navigation?: { label: string; url: string }[];
  secondary_navigation?: { label: string; url: string }[];
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  members_support_address?: string;
  url?: string;
  version?: string;
  [key: string]: unknown;
}

export interface UploadedImage {
  url: string;
  ref?: string | null;
}

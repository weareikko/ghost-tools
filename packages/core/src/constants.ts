/**
 * All supported Ghost resources.
 *
 * Single source of truth — MCP schema and handlers derive from this.
 *
 * Resource naming follows Ghost API path segments (lowercase, plural, kebab-case).
 */
export const RESOURCES = [
  // Admin API — content
  'posts',
  'pages',
  'tags',
  // Admin API — audience
  'members',
  'tiers',
  'newsletters',
  'offers',
  // Admin API — staff
  'users',
  'roles',
  'invites',
  // Admin API — integration
  'webhooks',
  // Admin API — uploads & themes
  'images',
  'themes',
  // Admin API — info
  'site',
  'settings',
  // Content API — public-facing
  'authors',
] as const;

export type Resource = (typeof RESOURCES)[number];

/**
 * All supported actions.
 *
 * Ghost's vocabulary is browse/read/add/edit/delete/copy/upload/activate.
 * `help` and `schema` are MCP-only doc actions.
 */
export const ACTIONS = [
  'browse',
  'read',
  'add',
  'edit',
  'delete',
  'copy',
  'upload',
  'activate',
  'help',
  'schema',
] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * Actions that are safe to auto-approve in MCP clients.
 */
export const READ_ACTIONS = ['browse', 'read', 'help', 'schema'] as const;
export type ReadAction = (typeof READ_ACTIONS)[number];

/**
 * Actions that mutate state and should require user confirmation.
 */
export const WRITE_ACTIONS = ['add', 'edit', 'delete', 'copy', 'upload', 'activate'] as const;
export type WriteAction = (typeof WRITE_ACTIONS)[number];

export function isReadAction(action: string): action is ReadAction {
  return (READ_ACTIONS as readonly string[]).includes(action);
}

export function isWriteAction(action: string): action is WriteAction {
  return (WRITE_ACTIONS as readonly string[]).includes(action);
}

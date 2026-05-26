/**
 * Tool execution handlers — shared between stdio and HTTP transports.
 *
 * The MCP layer is thin: validate the request, build an ExecutorContext,
 * dispatch to a per-resource handler, and wrap the result in the MCP envelope.
 */

import type { ExecutorContext } from '@ikko-dev/ghost-core';

import type {
  AddMemberOptions,
  AddNewsletterOptions,
  AddPageOptions,
  AddPostOptions,
  AddTagOptions,
  AddTierOptions,
} from '@ikko-dev/ghost-core';
import { GhostHttpClient, isGhostApiError } from '@ikko-dev/ghost-api';
import {
  addInvite,
  addMember,
  addNewsletter,
  addOffer,
  addPage,
  addPost,
  addTag,
  addTier,
  addWebhook,
  browseAuthors,
  browseInvites,
  browseMembers,
  browseNewsletters,
  browseOffers,
  browsePages,
  browsePosts,
  browseRoles,
  browseTags,
  browseTiers,
  browseUsers,
  copyPage,
  copyPost,
  deleteInvite,
  deletePage,
  deletePost,
  deleteTag,
  deleteUser,
  deleteWebhook,
  editMember,
  editNewsletter,
  editOffer,
  editPage,
  editPost,
  editSettings,
  editTag,
  editTier,
  editUser,
  editWebhook,
  isReadAction,
  isWriteAction,
  readAuthor,
  readInvite,
  readMember,
  readNewsletter,
  readOffer,
  readPage,
  readPost,
  readSettings,
  readSite,
  readTag,
  readTier,
  readUser,
  RESOURCES,
  uploadImage,
  uploadTheme,
  activateTheme,
} from '@ikko-dev/ghost-core';

import { isUserInputError, UserInputError } from './errors.ts';

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface Credentials {
  ghostUrl: string;
  staffAccessToken?: string;
  contentApiKey?: string;
}

function ok(data: unknown): ToolResult {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: 'text', text }],
    structuredContent: { success: true, result: data },
  };
}

function fail(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    structuredContent: { success: false, error: message },
    isError: true,
  };
}

function buildContext(
  credentials: Credentials,
  api: 'admin' | 'content',
): ExecutorContext {
  if (api === 'admin' && !credentials.staffAccessToken) {
    throw new UserInputError('Admin API call requires staffAccessToken.');
  }
  if (api === 'content' && !credentials.contentApiKey) {
    throw new UserInputError('Content API call requires contentApiKey.');
  }

  const client = new GhostHttpClient({
    admin:
      api === 'admin' && credentials.staffAccessToken
        ? { url: credentials.ghostUrl, staffAccessToken: credentials.staffAccessToken }
        : undefined,
    content:
      api === 'content' && credentials.contentApiKey
        ? { url: credentials.ghostUrl, contentApiKey: credentials.contentApiKey }
        : undefined,
  });
  return { client, api };
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}
function asLimit(v: unknown): number | 'all' | undefined {
  if (v === 'all') return 'all';
  return asNumber(v);
}
function asPayload(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function browseArgs(args: Record<string, unknown>) {
  return {
    filter: asString(args.filter),
    include: asString(args.include),
    fields: asString(args.fields),
    formats: asString(args.formats),
    limit: asLimit(args.limit),
    page: asNumber(args.page),
    order: asString(args.order),
  };
}

function readArgs(args: Record<string, unknown>) {
  return {
    id: asString(args.id),
    slug: asString(args.slug),
    include: asString(args.include),
    fields: asString(args.fields),
    formats: asString(args.formats),
  };
}

/**
 * Dispatch a (resource, action) pair to its executor and shape the response.
 */
async function dispatch(
  resource: string,
  action: string,
  args: Record<string, unknown>,
  credentials: Credentials,
): Promise<ToolResult> {
  const adminCtx = () => buildContext(credentials, 'admin');
  const contentCtx = () => buildContext(credentials, 'content');
  const payload = asPayload(args.payload);

  switch (resource) {
    case 'posts': {
      if (action === 'browse') return ok((await browsePosts(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readPost(readArgs(args), adminCtx())).data);
      if (action === 'add') {
        if (typeof payload.title !== 'string') return fail('posts.add requires payload.title');
        return ok((await addPost(payload as unknown as AddPostOptions, adminCtx())).data);
      }
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('posts.edit requires id');
        return ok((await editPost({ id, updated_at: String(payload.updated_at ?? ''), ...payload }, adminCtx())).data);
      }
      if (action === 'delete') {
        const id = asString(args.id);
        if (!id) return fail('posts.delete requires id');
        await deletePost({ id }, adminCtx());
        return ok(`Post ${id} deleted.`);
      }
      if (action === 'copy') {
        const id = asString(args.id);
        if (!id) return fail('posts.copy requires id');
        return ok((await copyPost({ id }, adminCtx())).data);
      }
      return fail(`Unknown action "${action}" for posts.`);
    }
    case 'pages': {
      if (action === 'browse') return ok((await browsePages(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readPage(readArgs(args), adminCtx())).data);
      if (action === 'add') {
        if (typeof payload.title !== 'string') return fail('pages.add requires payload.title');
        return ok((await addPage(payload as unknown as AddPageOptions, adminCtx())).data);
      }
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('pages.edit requires id');
        return ok((await editPage({ id, updated_at: String(payload.updated_at ?? ''), ...payload }, adminCtx())).data);
      }
      if (action === 'delete') {
        const id = asString(args.id);
        if (!id) return fail('pages.delete requires id');
        await deletePage({ id }, adminCtx());
        return ok(`Page ${id} deleted.`);
      }
      if (action === 'copy') {
        const id = asString(args.id);
        if (!id) return fail('pages.copy requires id');
        return ok((await copyPage({ id }, adminCtx())).data);
      }
      return fail(`Unknown action "${action}" for pages.`);
    }
    case 'tags': {
      if (action === 'browse') return ok((await browseTags(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readTag(readArgs(args), adminCtx())).data);
      if (action === 'add') {
        if (typeof payload.name !== 'string') return fail('tags.add requires payload.name');
        return ok((await addTag(payload as unknown as AddTagOptions, adminCtx())).data);
      }
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('tags.edit requires id');
        return ok((await editTag({ id, ...payload }, adminCtx())).data);
      }
      if (action === 'delete') {
        const id = asString(args.id);
        if (!id) return fail('tags.delete requires id');
        await deleteTag({ id }, adminCtx());
        return ok(`Tag ${id} deleted.`);
      }
      return fail(`Unknown action "${action}" for tags.`);
    }
    case 'members': {
      if (action === 'browse') return ok((await browseMembers(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readMember(readArgs(args), adminCtx())).data);
      if (action === 'add') {
        if (typeof payload.email !== 'string') return fail('members.add requires payload.email');
        return ok((await addMember(payload as unknown as AddMemberOptions, adminCtx())).data);
      }
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('members.edit requires id');
        return ok((await editMember({ id, ...payload }, adminCtx())).data);
      }
      return fail(`Unknown action "${action}" for members.`);
    }
    case 'tiers': {
      if (action === 'browse') return ok((await browseTiers(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readTier(readArgs(args), adminCtx())).data);
      if (action === 'add') {
        if (typeof payload.name !== 'string') return fail('tiers.add requires payload.name');
        return ok((await addTier(payload as unknown as AddTierOptions, adminCtx())).data);
      }
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('tiers.edit requires id');
        return ok((await editTier({ id, ...payload }, adminCtx())).data);
      }
      return fail(`Unknown action "${action}" for tiers.`);
    }
    case 'newsletters': {
      if (action === 'browse') return ok((await browseNewsletters(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readNewsletter(readArgs(args), adminCtx())).data);
      if (action === 'add') {
        if (typeof payload.name !== 'string') return fail('newsletters.add requires payload.name');
        return ok((await addNewsletter(payload as unknown as AddNewsletterOptions, adminCtx())).data);
      }
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('newsletters.edit requires id');
        return ok((await editNewsletter({ id, ...payload }, adminCtx())).data);
      }
      return fail(`Unknown action "${action}" for newsletters.`);
    }
    case 'offers': {
      if (action === 'browse') return ok((await browseOffers(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readOffer(readArgs(args), adminCtx())).data);
      if (action === 'add') {
        const required = ['name', 'code', 'type', 'cadence', 'amount', 'duration', 'tier'];
        const missing = required.filter((k) => payload[k] === undefined);
        if (missing.length > 0) return fail(`offers.add missing required: ${missing.join(', ')}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- payload type is dynamic
        return ok((await addOffer(payload as any, adminCtx())).data);
      }
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('offers.edit requires id');
        return ok((await editOffer({ id, ...payload }, adminCtx())).data);
      }
      return fail(`Unknown action "${action}" for offers.`);
    }
    case 'users': {
      if (action === 'browse') return ok((await browseUsers(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readUser(readArgs(args), adminCtx())).data);
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('users.edit requires id');
        return ok((await editUser({ id, ...payload }, adminCtx())).data);
      }
      if (action === 'delete') {
        const id = asString(args.id);
        if (!id) return fail('users.delete requires id');
        await deleteUser({ id }, adminCtx());
        return ok(`User ${id} deleted.`);
      }
      return fail(`Unknown action "${action}" for users.`);
    }
    case 'roles': {
      if (action === 'browse') return ok((await browseRoles(browseArgs(args), adminCtx())).data);
      return fail(`Unknown action "${action}" for roles.`);
    }
    case 'invites': {
      if (action === 'browse') return ok((await browseInvites(browseArgs(args), adminCtx())).data);
      if (action === 'read') return ok((await readInvite(readArgs(args), adminCtx())).data);
      if (action === 'add') {
        const email = asString(payload.email);
        if (!email) return fail('invites.add requires email');
        return ok(
          (await addInvite({ email, role_id: asString(payload.role_id) }, adminCtx())).data,
        );
      }
      if (action === 'delete') {
        const id = asString(args.id);
        if (!id) return fail('invites.delete requires id');
        await deleteInvite({ id }, adminCtx());
        return ok(`Invite ${id} deleted.`);
      }
      return fail(`Unknown action "${action}" for invites.`);
    }
    case 'webhooks': {
      if (action === 'add') {
        const event = asString(payload.event);
        const target_url = asString(payload.target_url);
        if (!event || !target_url) return fail('webhooks.add requires event and target_url');
        return ok((await addWebhook({ event, target_url, ...payload }, adminCtx())).data);
      }
      if (action === 'edit') {
        const id = asString(args.id);
        if (!id) return fail('webhooks.edit requires id');
        return ok((await editWebhook({ id, ...payload }, adminCtx())).data);
      }
      if (action === 'delete') {
        const id = asString(args.id);
        if (!id) return fail('webhooks.delete requires id');
        await deleteWebhook({ id }, adminCtx());
        return ok(`Webhook ${id} deleted.`);
      }
      return fail(`Unknown action "${action}" for webhooks.`);
    }
    case 'images': {
      if (action === 'upload') {
        const file = asString(args.file);
        const filename = asString(args.filename);
        if (!file || !filename) return fail('images.upload requires file (base64) and filename');
        const bytes = Buffer.from(file, 'base64');
        const blob = new Blob([new Uint8Array(bytes)]);
        return ok((await uploadImage({ file: blob, filename }, adminCtx())).data);
      }
      return fail(`Unknown action "${action}" for images.`);
    }
    case 'themes': {
      if (action === 'upload') {
        const file = asString(args.file);
        const filename = asString(args.filename);
        if (!file || !filename) return fail('themes.upload requires file (base64) and filename');
        const bytes = Buffer.from(file, 'base64');
        const blob = new Blob([new Uint8Array(bytes)]);
        return ok((await uploadTheme({ file: blob, filename }, adminCtx())).data);
      }
      if (action === 'activate') {
        const name = asString(args.name);
        if (!name) return fail('themes.activate requires name');
        return ok((await activateTheme({ name }, adminCtx())).data);
      }
      return fail(`Unknown action "${action}" for themes.`);
    }
    case 'site': {
      if (action === 'read') return ok((await readSite({}, adminCtx())).data);
      return fail(`Unknown action "${action}" for site.`);
    }
    case 'settings': {
      if (action === 'read') return ok((await readSettings({}, adminCtx())).data);
      if (action === 'edit') {
        const settings = payload.settings;
        if (!Array.isArray(settings)) return fail('settings.edit requires a settings array');
        return ok(
          (await editSettings({ settings: settings as { key: string; value: unknown }[] }, adminCtx())).data,
        );
      }
      return fail(`Unknown action "${action}" for settings.`);
    }
    case 'authors': {
      if (action === 'browse') return ok((await browseAuthors(browseArgs(args), contentCtx())).data);
      if (action === 'read') return ok((await readAuthor(readArgs(args), contentCtx())).data);
      return fail(`Unknown action "${action}" for authors (content API).`);
    }
    default:
      return fail(
        `Unknown resource "${resource}". Valid resources: ${RESOURCES.join(', ')}.`,
      );
  }
}

/**
 * Entry point used by both stdio and HTTP transports.
 *
 * Validates that the action matches the tool (read vs write) and dispatches.
 */
export async function executeToolWithCredentials(
  toolName: string,
  args: Record<string, unknown>,
  credentials: Credentials,
): Promise<ToolResult> {
  const resource = asString(args.resource);
  const action = asString(args.action);

  if (!resource || !action) {
    return fail('Missing required fields: "resource" and "action".');
  }

  // help / schema are available on the read tool without an API call
  if (action === 'help') {
    if (toolName !== 'ghost') {
      return fail('action="help" is only valid for the "ghost" tool.');
    }
    return ok(buildHelp(resource));
  }
  if (action === 'schema') {
    if (toolName !== 'ghost') {
      return fail('action="schema" is only valid for the "ghost" tool.');
    }
    return ok(buildSchema(resource));
  }

  if (toolName === 'ghost' && isWriteAction(action)) {
    return fail(`Action "${action}" is a write operation. Use the "ghost_write" tool instead.`);
  }
  if (toolName === 'ghost_write' && isReadAction(action)) {
    return fail(`Action "${action}" is a read operation. Use the "ghost" tool instead.`);
  }

  if (!(RESOURCES as readonly string[]).includes(resource)) {
    return fail(`Unknown resource "${resource}". Valid: ${RESOURCES.join(', ')}.`);
  }

  try {
    return await dispatch(resource, action, args, credentials);
  } catch (error) {
    let message: string;
    if (isUserInputError(error)) {
      message = error.toFormattedMessage();
    } else if (isGhostApiError(error)) {
      message = `Ghost API error (${error.status}): ${error.message}`;
    } else {
      message = error instanceof Error ? error.message : String(error);
    }
    return fail(message);
  }
}

function buildHelp(resource: string): string {
  const lines: string[] = [];
  lines.push(`# Ghost MCP — \`${resource}\``);
  lines.push('');

  const helpEntries: Record<string, string[]> = {
    posts: [
      'Actions: browse, read, add, edit, delete, copy',
      'browse: filter (NQL), include (authors,tags), formats (html,lexical), limit, page, order',
      'read: id OR slug',
      'add (payload): { title, status?, mobiledoc?, lexical?, html?, tags?, authors?, ... }',
      'edit (payload): { updated_at, ...changed fields } — Ghost requires updated_at',
    ],
    pages: ['Same as posts but for static pages.'],
    tags: [
      'Actions: browse, read, add, edit, delete',
      'add (payload): { name, slug?, description? }',
    ],
    members: [
      'Actions: browse, read, add, edit',
      'add (payload): { email, name?, note?, subscribed?, labels?, tiers? }',
    ],
    tiers: ['Actions: browse, read, add, edit', 'add (payload): { name, monthly_price?, ... }'],
    newsletters: ['Actions: browse, read, add, edit', 'add (payload): { name, sender_email?, ... }'],
    offers: [
      'Actions: browse, read, add, edit',
      'add (payload): { name, code, type (percent|fixed|trial), cadence (month|year), amount, duration, tier: { id } }',
    ],
    users: ['Actions: browse, read, edit, delete (no add — use invites)'],
    roles: ['Actions: browse'],
    invites: ['Actions: browse, read, add, delete', 'add (payload): { email, role_id? }'],
    webhooks: [
      'Actions: add, edit, delete (no browse/read in Admin API)',
      'add (payload): { event, target_url, name? }',
    ],
    images: ['Actions: upload', 'upload: file (base64), filename'],
    themes: ['Actions: upload, activate', 'upload: file (base64), filename; activate: name'],
    site: ['Actions: read'],
    settings: ['Actions: read, edit', 'edit (payload): { settings: [{ key, value }] }'],
    authors: ['Actions: browse, read (Content API)'],
  };

  if (helpEntries[resource]) {
    for (const line of helpEntries[resource]) lines.push(`- ${line}`);
  } else {
    lines.push('_No help entry yet for this resource._');
  }
  return lines.join('\n');
}

function buildSchema(resource: string): Record<string, unknown> {
  // Minimal schema — names of the JSON fields the user typically passes via payload.
  const schemas: Record<string, Record<string, unknown>> = {
    posts: {
      payload: 'Partial<Post>',
      requiredOnAdd: ['title'],
      requiredOnEdit: ['updated_at'],
    },
    pages: {
      payload: 'Partial<Page>',
      requiredOnAdd: ['title'],
      requiredOnEdit: ['updated_at'],
    },
    tags: { payload: 'Partial<Tag>', requiredOnAdd: ['name'] },
    members: { payload: 'Partial<Member>', requiredOnAdd: ['email'] },
    tiers: { payload: 'Partial<Tier>', requiredOnAdd: ['name'] },
    newsletters: { payload: 'Partial<Newsletter>', requiredOnAdd: ['name'] },
    offers: {
      payload: 'Partial<Offer>',
      requiredOnAdd: ['name', 'code', 'type', 'cadence', 'amount', 'duration', 'tier'],
    },
    users: { payload: 'Partial<User>' },
    invites: { payload: '{ email, role_id? }' },
    webhooks: { payload: 'Partial<Webhook>', requiredOnAdd: ['event', 'target_url'] },
    images: { fields: ['file (base64)', 'filename'] },
    themes: { fields: ['file (base64)', 'filename', 'name (for activate)'] },
    site: { actions: ['read'] },
    settings: { payload: '{ settings: [{ key, value }] }' },
    authors: { actions: ['browse', 'read'], note: 'Content API resource' },
  };
  return schemas[resource] ?? { unknown: resource };
}

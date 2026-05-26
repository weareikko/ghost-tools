import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import { READ_ACTIONS, RESOURCES, WRITE_ACTIONS } from '@ikko-dev/ghost-core';

/**
 * Output envelope shared by both tools.
 */
const OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const, description: 'Whether the operation succeeded' } as object,
    result: {
      description: 'Operation result — shape varies by resource and action.',
    } as object,
    error: {
      type: 'string' as const,
      description: 'Error message (only on failure)',
    } as object,
  },
  required: ['success'],
};

/**
 * Input properties shared by both tools.
 *
 * The `ghost` and `ghost_write` tools differ only in the `action` enum and
 * the destructive-hint metadata.
 */
const SHARED_INPUT_PROPERTIES = {
  resource: {
    type: 'string' as const,
    enum: [...RESOURCES],
    description: 'Ghost resource to operate on',
  },
  id: {
    type: 'string' as const,
    description: 'Resource ID (for read, edit, delete, copy)',
  },
  slug: {
    type: 'string' as const,
    description: 'Resource slug (alternative to id for posts/pages/tags/users/authors)',
  },
  filter: {
    type: 'string' as const,
    description: 'NQL filter expression for browse, e.g. "status:published+tag:news"',
  },
  include: {
    type: 'string' as const,
    description: 'Comma-separated relations to include, e.g. "tags,authors"',
  },
  fields: {
    type: 'string' as const,
    description: 'Comma-separated field selection, e.g. "id,title,slug"',
  },
  formats: {
    type: 'string' as const,
    description: 'Content formats to return, e.g. "html,lexical,plaintext"',
  },
  limit: {
    type: ['string', 'number'] as unknown as string,
    description: 'Page size for browse (number or "all")',
  },
  page: {
    type: 'number' as const,
    description: 'Page number for browse (1-indexed)',
  },
  order: {
    type: 'string' as const,
    description: 'Sort order, e.g. "published_at desc"',
  },
  payload: {
    type: 'object' as const,
    description:
      'Body for add/edit operations. For posts/pages, must include title (add) and updated_at (edit).',
    additionalProperties: true,
  },
  name: {
    type: 'string' as const,
    description: 'Theme name (for themes.activate)',
  },
};

const GHOST_READ_TOOL: Tool = {
  name: 'ghost',
  title: 'Ghost CMS',
  description: [
    'Ghost CMS — read-only operations.',
    `Resources: ${RESOURCES.join(', ')}.`,
    `Actions: ${[...READ_ACTIONS].join(', ')}.`,
    'Discovery: action="help" with any resource for required fields and examples.',
    'Browse supports NQL filters via the filter field.',
  ].join('\n'),
  annotations: {
    title: 'Ghost CMS',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: {
    type: 'object' as const,
    properties: {
      ...SHARED_INPUT_PROPERTIES,
      action: {
        type: 'string' as const,
        enum: [...READ_ACTIONS],
        description: 'Read action to perform. Use "help" for documentation.',
      },
    },
    required: ['resource', 'action'],
  },
  outputSchema: OUTPUT_SCHEMA,
};

const GHOST_WRITE_TOOL: Tool = {
  name: 'ghost_write',
  title: 'Ghost CMS (Write)',
  description: [
    'Ghost CMS — write operations (add, edit, delete, copy, upload, activate).',
    `Resources: ${RESOURCES.join(', ')}.`,
    `Actions: ${[...WRITE_ACTIONS].join(', ')}.`,
    'Edits require the resource\'s updated_at value for optimistic concurrency.',
    'Use the ghost tool with action="help" for resource documentation.',
  ].join('\n'),
  annotations: {
    title: 'Ghost CMS (Write)',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    type: 'object' as const,
    properties: {
      ...SHARED_INPUT_PROPERTIES,
      action: {
        type: 'string' as const,
        enum: [...WRITE_ACTIONS],
        description: 'Write action to perform',
      },
      file: {
        type: 'string' as const,
        description:
          'Base64-encoded file bytes for upload actions (images, themes). Use the `filename` field for the original name.',
      },
      filename: {
        type: 'string' as const,
        description: 'Original filename for uploads, e.g. "hero.jpg" or "casper.zip"',
      },
    },
    required: ['resource', 'action'],
  },
  outputSchema: OUTPUT_SCHEMA,
};

export const TOOLS: Tool[] = [GHOST_READ_TOOL, GHOST_WRITE_TOOL];

export interface GetToolsOptions {
  /** When true, ghost_write is excluded entirely. */
  readOnly?: boolean;
}

export function getTools(options?: GetToolsOptions): Tool[] {
  if (options?.readOnly) {
    return TOOLS.filter((t) => t.name !== 'ghost_write');
  }
  return [...TOOLS];
}

/**
 * Stdio-only configuration tools — let the user save credentials to the
 * XDG config file so subsequent stdio invocations need no env vars.
 */
export const STDIO_ONLY_TOOLS: Tool[] = [
  {
    name: 'ghost_configure',
    title: 'Configure Ghost',
    description:
      'Save Ghost credentials to the local XDG config directory. Used in stdio mode only.',
    annotations: {
      title: 'Configure Ghost',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string' as const,
          description: 'Ghost site URL, e.g. https://my-blog.ghost.io',
        },
        staffAccessToken: {
          type: 'string' as const,
          description: 'Staff access token in id:hexSecret format',
        },
        contentApiKey: {
          type: 'string' as const,
          description: 'Optional Content API key (26 hex chars)',
        },
      },
    },
    outputSchema: {
      type: 'object' as const,
      properties: {
        success: { type: 'boolean' as const },
        message: { type: 'string' as const },
      },
      required: ['success'],
    },
  },
  {
    name: 'ghost_get_config',
    title: 'Get Ghost Config',
    description: 'Get the current Ghost configuration (masked).',
    annotations: {
      title: 'Get Ghost Config',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { type: 'object' as const, properties: {} },
    outputSchema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string' as const },
        staffAccessToken: { type: 'string' as const },
        contentApiKey: { type: 'string' as const },
        configured: { type: 'boolean' as const },
      },
      required: ['configured'],
    },
  },
];

# @ikko-dev/ghost-api

Low-level HTTP client for the Ghost CMS APIs (Admin + Content).

Used internally by [`@ikko-dev/ghost-sdk`](../sdk), [`@ikko-dev/ghost-core`](../core),
and [`@ikko-dev/ghost-mcp`](../mcp). You can also use it directly if you want a
thin layer that handles JWT signing, error normalization, and URL building.

## Install

```bash
npm install @ikko-dev/ghost-api
```

## Usage

### Admin API (staff access token)

```ts
import { GhostHttpClient } from '@ikko-dev/ghost-api';

const client = new GhostHttpClient({
  admin: {
    url: 'https://my-blog.ghost.io',
    staffAccessToken: 'xxxxxxxxxxxxxxxxxxxxxxxx:abcdef...',
  },
});

const { posts } = await client.admin_<{ posts: Post[] }>('GET', '/posts');
```

### Content API (content API key)

```ts
const client = new GhostHttpClient({
  content: {
    url: 'https://my-blog.ghost.io',
    contentApiKey: 'abcdef0123456789abcdef0123',
  },
});

const { posts } = await client.content_<{ posts: Post[] }>('GET', '/posts');
```

## What this package does for you

- **JWT signing**: turns a `id:secret` staff access token into a short-lived
  HS256 JWT and attaches it as `Authorization: Ghost <jwt>` on every Admin call.
- **URL building**: enforces Ghost's trailing-slash convention.
- **Error normalization**: non-2xx responses throw `GhostApiError` with the
  full `errors[]` array Ghost returns.
- **Versioning**: sends `Accept-Version: v5.0` by default (override via
  `acceptVersion` option).

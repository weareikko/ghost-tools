# @ikko-dev/ghost-sdk

Fluent TypeScript SDK for [Ghost CMS](https://ghost.org). Built on
[`@ikko-dev/ghost-api`](../api).

## Install

```bash
npm install @ikko-dev/ghost-sdk
```

## Usage

```ts
import { Ghost } from "@ikko-dev/ghost-sdk";

const ghost = new Ghost({
  admin: {
    url: "https://my-blog.ghost.io",
    staffAccessToken: "xxxxxxxxxxxxxxxxxxxxxxxx:abcdef...",
  },
});

// Browse posts
const { items, meta } = await ghost.posts.browse({ filter: "status:published", limit: 10 });

// Read one
const post = await ghost.posts.read("64...");

// Create
const created = await ghost.posts.add({ title: "Hello world", status: "draft" });

// Update (Ghost requires `updated_at` for optimistic concurrency)
await ghost.posts.edit(created!.id, {
  title: "Updated title",
  updated_at: created!.updated_at!,
});

// Delete
await ghost.posts.delete(created!.id);
```

## Pagination helper

```ts
import { paginate } from "@ikko-dev/ghost-sdk";

for await (const post of paginate((page) => ghost.posts.browse({ page, limit: 50 }))) {
  console.log(post.title);
}
```

## Resources

| Property                                                                 | API     | CRUD verbs                                            |
| ------------------------------------------------------------------------ | ------- | ----------------------------------------------------- |
| `posts`, `pages`                                                         | Admin   | browse, read, readBySlug, add, edit, delete, copy     |
| `tags`, `members`, `tiers`, `newsletters`, `offers`, `users`, `webhooks` | Admin   | browse, read, add, edit, delete (subset per resource) |
| `contentPosts`, `contentPages`, `contentTags`, `contentTiers`, `authors` | Content | browse, read, readBySlug                              |
| `site()`, `roles()`, `uploadImage(...)`                                  | Admin   | one-shot helpers                                      |

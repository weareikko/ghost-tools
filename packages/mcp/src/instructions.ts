/**
 * Instructions sent to MCP clients during initialization.
 *
 * These give the LLM a high-level guide on how to use the Ghost MCP tools.
 */

export const INSTRUCTIONS = `# Ghost CMS MCP Server

Talk to a Ghost blog through two tools:

- **\`ghost\`** — read-only operations (browse posts, read tags, etc.)
- **\`ghost_write\`** — mutating operations (add a post, edit a tag, delete a member, etc.)

The two tools share the same shape: \`resource\`, \`action\`, plus action-specific fields.

## Resources

\`posts\`, \`pages\`, \`tags\`, \`members\`, \`tiers\`, \`newsletters\`, \`offers\`, \`users\`, \`roles\`, \`invites\`, \`webhooks\`, \`images\`, \`themes\`, \`site\`, \`settings\`, \`authors\` (content API).

## Actions

- **Read tool (\`ghost\`)**: \`browse\`, \`read\`, \`help\`, \`schema\`
- **Write tool (\`ghost_write\`)**: \`add\`, \`edit\`, \`delete\`, \`copy\`, \`upload\`, \`activate\`

## Tips

- Use \`action="help"\` with a resource to learn the valid actions and required fields for it.
- Filtering uses Ghost's NQL: e.g. \`filter="status:published+tag:news"\`.
- Editing requires \`updated_at\` for optimistic concurrency (Ghost rejects stale updates).
- Authors are exposed on the Content API only — for staff users use the \`users\` resource.
- When in doubt, browse first to discover IDs, then edit/delete by ID.
`;

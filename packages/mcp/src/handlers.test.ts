import { describe, expect, it } from 'vitest';

import { executeToolWithCredentials } from './handlers.ts';

const CREDS = {
  ghostUrl: 'https://x.ghost.io',
  staffAccessToken: 'id:cafebabe',
};

describe('executeToolWithCredentials', () => {
  it('rejects calls missing resource or action', async () => {
    const r = await executeToolWithCredentials('ghost', {}, CREDS);
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/resource.*action/);
  });

  it('rejects write actions on the read tool', async () => {
    const r = await executeToolWithCredentials(
      'ghost',
      { resource: 'posts', action: 'delete', id: 'x' },
      CREDS,
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/write operation/);
  });

  it('rejects read actions on the write tool', async () => {
    const r = await executeToolWithCredentials(
      'ghost_write',
      { resource: 'posts', action: 'browse' },
      CREDS,
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/read operation/);
  });

  it('serves help without an API call', async () => {
    const r = await executeToolWithCredentials(
      'ghost',
      { resource: 'posts', action: 'help' },
      CREDS,
    );
    expect(r.isError).toBeUndefined();
    expect(r.content[0].text).toMatch(/posts/);
  });

  it('rejects unknown resource', async () => {
    const r = await executeToolWithCredentials(
      'ghost',
      { resource: 'spaceships', action: 'browse' },
      CREDS,
    );
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/Unknown resource/);
  });
});

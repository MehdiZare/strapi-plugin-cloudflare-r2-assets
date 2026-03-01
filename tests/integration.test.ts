/**
 * Integration tests against a real Cloudflare R2 bucket.
 *
 * Skipped unless all required env vars are set:
 *   CF_R2_ACCOUNT_ID, CF_R2_BUCKET, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY
 *
 * Run manually:
 *   CF_R2_ACCOUNT_ID=… CF_R2_BUCKET=… CF_R2_ACCESS_KEY_ID=… CF_R2_SECRET_ACCESS_KEY=… npm test
 */
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createR2Client, buildObjectUrl, buildBucketUrl } from '../src/shared/r2-client';
import { resolvePluginConfig } from '../src/shared/config';

const hasR2Credentials = !!(
  process.env.CF_R2_ACCOUNT_ID &&
  process.env.CF_R2_BUCKET &&
  process.env.CF_R2_ACCESS_KEY_ID &&
  process.env.CF_R2_SECRET_ACCESS_KEY
);

const config = hasR2Credentials
  ? resolvePluginConfig({
      accountId: process.env.CF_R2_ACCOUNT_ID,
      bucket: process.env.CF_R2_BUCKET,
      accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
      publicBaseUrl: process.env.CF_PUBLIC_BASE_URL ?? 'https://placeholder.example.com',
    })
  : null;

const testPrefix = `__integration-test/${Date.now()}`;

describe.skipIf(!hasR2Credentials)('R2 integration', () => {
  it('HEAD bucket succeeds with valid credentials', async () => {
    const client = createR2Client(config!);
    const url = buildBucketUrl(client.endpoint, config!.bucket);
    const response = await client.fetch(url, { method: 'HEAD' });

    expect(response.ok).toBe(true);
  });

  it('PUT uploads a Buffer body', async () => {
    const client = createR2Client(config!);
    const key = `${testPrefix}/buffer.txt`;
    const url = buildObjectUrl(client.endpoint, config!.bucket, key);

    const response = await client.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: Buffer.from('buffer-test-data'),
      duplex: 'half',
    } as RequestInit);

    expect(response.ok).toBe(true);

    // cleanup
    await client.fetch(url, { method: 'DELETE' });
  });

  it('PUT uploads a ReadableStream body via Readable.toWeb()', async () => {
    const client = createR2Client(config!);
    const key = `${testPrefix}/stream.txt`;
    const url = buildObjectUrl(client.endpoint, config!.bucket, key);

    const stream = Readable.toWeb(Readable.from(Buffer.from('stream-test-data'))) as ReadableStream;
    const response = await client.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: stream,
      duplex: 'half',
    } as RequestInit);

    expect(response.ok).toBe(true);

    // cleanup
    await client.fetch(url, { method: 'DELETE' });
  });

  it('DELETE succeeds for an existing object', async () => {
    const client = createR2Client(config!);
    const key = `${testPrefix}/to-delete.txt`;
    const url = buildObjectUrl(client.endpoint, config!.bucket, key);

    // create first
    await client.fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: Buffer.from('delete-me'),
      duplex: 'half',
    } as RequestInit);

    const response = await client.fetch(url, { method: 'DELETE' });
    expect(response.ok).toBe(true);
  });

  it('DELETE returns 2xx for a non-existent object', async () => {
    const client = createR2Client(config!);
    const key = `${testPrefix}/nonexistent-${Date.now()}.txt`;
    const url = buildObjectUrl(client.endpoint, config!.bucket, key);

    const response = await client.fetch(url, { method: 'DELETE' });
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  });
});

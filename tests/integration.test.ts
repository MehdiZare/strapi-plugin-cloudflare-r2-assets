/**
 * Integration tests against a real Cloudflare R2 bucket.
 *
 * Skipped unless all required env vars are set:
 *   CF_R2_ACCOUNT_ID, CF_R2_BUCKET, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY
 *
 * Setup:
 *   cp .env.test.example .env.test   # then fill in credentials
 *   npm test
 */
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { init } from '../src/provider/index';
import type { ProviderUploadFile } from '../src/shared/types';

const hasR2Credentials = !!(
  process.env.CF_R2_ACCOUNT_ID &&
  process.env.CF_R2_BUCKET &&
  process.env.CF_R2_ACCESS_KEY_ID &&
  process.env.CF_R2_SECRET_ACCESS_KEY
);

const providerOptions = hasR2Credentials
  ? {
      accountId: process.env.CF_R2_ACCOUNT_ID!,
      bucket: process.env.CF_R2_BUCKET!,
      accessKeyId: process.env.CF_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
      publicBaseUrl: process.env.CF_PUBLIC_BASE_URL ?? 'https://placeholder.example.com',
      basePath: `__integration-test/${Date.now()}`,
    }
  : null;

const createFile = (overrides: Partial<ProviderUploadFile> = {}): ProviderUploadFile => ({
  name: 'test-file.txt',
  hash: `test_${Date.now()}`,
  ext: '.txt',
  mime: 'text/plain',
  size: 16,
  url: '',
  buffer: Buffer.from('integration-test'),
  ...overrides,
});

describe.skipIf(!hasR2Credentials)('R2 provider integration', () => {
  it('upload() stores a Buffer and mutates the file object', async () => {
    const provider = init(providerOptions!);
    const file = createFile();

    await provider.upload(file);

    expect(file.url).toContain(file.hash);
    expect(file.provider).toBe('strapi-plugin-cloudflare-r2-assets');
    expect(file.provider_metadata).toMatchObject({
      bucket: providerOptions!.bucket,
      key: expect.stringContaining(file.hash),
    });

    // cleanup
    await provider.delete(file);
  });

  it('uploadStream() stores a Readable stream', async () => {
    const provider = init(providerOptions!);
    const file = createFile({
      hash: `stream_${Date.now()}`,
      buffer: undefined,
      stream: Readable.from(Buffer.from('stream-integration-test')),
    });

    await provider.uploadStream(file);

    expect(file.url).toContain(file.hash);
    expect(file.provider_metadata?.key).toContain(file.hash);

    // cleanup
    await provider.delete(file);
  });

  it('delete() removes an uploaded object without error', async () => {
    const provider = init(providerOptions!);
    const file = createFile({ hash: `delete_${Date.now()}` });

    await provider.upload(file);
    // should not throw
    await provider.delete(file);
  });

  it('delete() succeeds silently for a non-existent object', async () => {
    const provider = init(providerOptions!);
    const file = createFile({ hash: `ghost_${Date.now()}` });

    // simulate a file that was "uploaded" but already removed
    file.url = `${providerOptions!.publicBaseUrl}/${providerOptions!.basePath}/${file.hash}.txt`;
    file.provider_metadata = {
      bucket: providerOptions!.bucket,
      key: `${providerOptions!.basePath}/${file.hash}.txt`,
    };

    // should not throw
    await provider.delete(file);
  });

  it('healthCheck() succeeds with valid credentials', async () => {
    const provider = init(providerOptions!);
    // should not throw
    await provider.healthCheck();
  });
});

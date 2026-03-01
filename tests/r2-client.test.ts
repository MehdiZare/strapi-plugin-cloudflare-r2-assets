import { beforeEach, describe, expect, it, vi } from 'vitest';

const constructorSpy = vi.fn();
const awsFetchSpy = vi.fn();

vi.mock('aws4fetch', () => ({
  AwsClient: class MockAwsClient {
    constructor(config: unknown) {
      constructorSpy(config);
    }
    fetch = awsFetchSpy;
  },
}));

import { createR2Client, buildObjectUrl, buildBucketUrl } from '../src/shared/r2-client';
import type { ResolvedPluginConfig } from '../src/shared/types';

const baseConfig: ResolvedPluginConfig = {
  accountId: 'acc_12345',
  bucket: 'media',
  endpoint: 'https://acc_12345.r2.cloudflarestorage.com',
  accessKeyId: 'key_id',
  secretAccessKey: 'secret_key',
  publicBaseUrl: 'https://media.example.com',
  basePath: 'uploads',
  formats: ['webp', 'avif'],
  quality: 82,
  maxFormats: 4,
};

describe('createR2Client', () => {
  beforeEach(() => {
    constructorSpy.mockClear();
    awsFetchSpy.mockReset();
  });

  it('passes credentials, service, and region to AwsClient', () => {
    createR2Client(baseConfig);

    expect(constructorSpy).toHaveBeenCalledWith({
      accessKeyId: 'key_id',
      secretAccessKey: 'secret_key',
      service: 's3',
      region: 'auto',
    });
  });

  it('strips trailing slashes from endpoint', () => {
    const client = createR2Client({ ...baseConfig, endpoint: 'https://example.com///' });
    expect(client.endpoint).toBe('https://example.com');
  });

  it('preserves endpoint without trailing slashes', () => {
    const client = createR2Client(baseConfig);
    expect(client.endpoint).toBe('https://acc_12345.r2.cloudflarestorage.com');
  });

  it('exposes bucket from config', () => {
    const client = createR2Client(baseConfig);
    expect(client.bucket).toBe('media');
  });

  it('delegates fetch to AwsClient', async () => {
    const mockResponse = new Response(null, { status: 200 });
    awsFetchSpy.mockResolvedValueOnce(mockResponse);

    const client = createR2Client(baseConfig);
    const result = await client.fetch('https://example.com/test', { method: 'GET' });

    expect(awsFetchSpy).toHaveBeenCalledWith('https://example.com/test', { method: 'GET' });
    expect(result).toBe(mockResponse);
  });
});

describe('buildObjectUrl', () => {
  it('constructs URL from endpoint, bucket, and key', () => {
    expect(buildObjectUrl('https://r2.example.com', 'media', 'uploads/file.jpg'))
      .toBe('https://r2.example.com/media/uploads/file.jpg');
  });

  it('handles keys with nested paths', () => {
    expect(buildObjectUrl('https://r2.example.com', 'media', 'a/b/c/file.txt'))
      .toBe('https://r2.example.com/media/a/b/c/file.txt');
  });
});

describe('buildBucketUrl', () => {
  it('constructs URL from endpoint and bucket', () => {
    expect(buildBucketUrl('https://r2.example.com', 'media'))
      .toBe('https://r2.example.com/media');
  });
});

import { Readable } from 'node:stream';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = sendMock;
  }

  class PutObjectCommand {
    constructor(public readonly input: unknown) {}
  }

  class DeleteObjectCommand {
    constructor(public readonly input: unknown) {}
  }

  class HeadBucketCommand {
    constructor(public readonly input: unknown) {}
  }

  return {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
  };
});

import provider from '../src/provider/index';
import type { ProviderUploadFile, RawPluginConfig } from '../src/shared/types';

const baseOptions: RawPluginConfig = {
  accountId: 'acc_12345',
  bucket: 'media',
  accessKeyId: 'key_id',
  secretAccessKey: 'secret_key',
  publicBaseUrl: 'https://media.example.com',
};

const createFile = (overrides: Partial<ProviderUploadFile> = {}): ProviderUploadFile => {
  return {
    name: 'a.jpg',
    hash: 'abc123',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 10,
    url: '',
    ...overrides,
  };
};

describe('provider upload', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
  });

  it('uploads using stream when buffer is absent', async () => {
    const instance = provider.init(baseOptions);
    const stream = Readable.from(Buffer.from('stream-data'));

    const file = createFile({ buffer: undefined, stream });
    await instance.uploadStream(file);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0]?.[0] as { input: { Body: unknown } };
    expect(command.input.Body).toBe(stream);
  });

  it('throws when file has neither buffer nor stream', async () => {
    const instance = provider.init(baseOptions);
    const file = createFile({ buffer: undefined, stream: undefined });

    await expect(instance.upload(file)).rejects.toThrow('missing both "buffer" and "stream"');
  });

  it('passes CacheControl header to PutObjectCommand', async () => {
    const instance = provider.init({ ...baseOptions, cacheControl: 'public, max-age=31536000' });
    const file = createFile({ buffer: Buffer.from('data') });

    await instance.upload(file);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0]?.[0] as { input: { CacheControl?: string } };
    expect(command.input.CacheControl).toBe('public, max-age=31536000');
  });

  it('sets file.url, provider_metadata, and formats after upload', async () => {
    const instance = provider.init(baseOptions);
    const file = createFile({
      buffer: Buffer.from('data'),
      width: 800,
      height: 600,
    });

    await instance.upload(file);

    expect(file.url).toBe('https://media.example.com/uploads/abc123.jpg');
    expect(file.provider).toBe('strapi-plugin-cloudflare-r2-assets');
    expect(file.provider_metadata).toEqual({
      bucket: 'media',
      key: 'uploads/abc123.jpg',
    });
    expect(file.formats).toBeDefined();
    expect(file.formats).toHaveProperty('webp');
    expect(file.formats).toHaveProperty('avif');
  });

  it('does not set formats for non-image files', async () => {
    const instance = provider.init(baseOptions);
    const file = createFile({
      buffer: Buffer.from('data'),
      mime: 'application/pdf',
      ext: '.pdf',
      hash: 'doc123',
    });

    await instance.upload(file);

    expect(file.url).toBe('https://media.example.com/uploads/doc123.pdf');
    expect(file.formats).toBeUndefined();
  });
});

describe('provider delete', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
  });

  it('deletes using sanitized provider metadata key', async () => {
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        provider_metadata: { key: '/uploads///a.jpg' },
      })
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0]?.[0] as { input: { Bucket: string; Key: string } };
    expect(command.input.Bucket).toBe('media');
    expect(command.input.Key).toBe('uploads/a.jpg');
  });

  it('falls back to extracting key from trusted public URL', async () => {
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        url: 'https://media.example.com/uploads/from-url.jpg?token=abc',
      })
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0]?.[0] as { input: { Bucket: string; Key: string } };
    expect(command.input.Key).toBe('uploads/from-url.jpg');
  });

  it('skips delete when URL does not match the configured origin', async () => {
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        url: 'https://media.example.com.attacker.example/uploads/a.jpg',
      })
    );

    expect(sendMock).not.toHaveBeenCalled();
  });
});

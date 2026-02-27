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

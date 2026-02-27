import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = sendMock;
  }

  class HeadBucketCommand {
    constructor(public readonly input: unknown) {}
  }

  return {
    S3Client,
    HeadBucketCommand,
    PutObjectCommand: class {
      constructor(public readonly input: unknown) {}
    },
    DeleteObjectCommand: class {
      constructor(public readonly input: unknown) {}
    },
  };
});

import createStatusService from '../server/src/services/status';

const providerOptions = {
  accountId: 'acc_12345',
  bucket: 'media',
  accessKeyId: 'key_id',
  secretAccessKey: 'secret_key',
  publicBaseUrl: 'https://media.example.com',
};

type MockStrapi = {
  config: {
    get: (key: string, defaultValue?: unknown) => unknown;
  };
  log: {
    warn: ReturnType<typeof vi.fn>;
  };
};

const createStrapi = (uploadConfig: unknown): MockStrapi => ({
  config: {
    get: (key, defaultValue) => (key === 'plugin::upload' ? uploadConfig : defaultValue),
  },
  log: {
    warn: vi.fn(),
  },
});

describe('status service', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('returns sanitized connectivity details when bucket check fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('request failed secretAccessKey=abc123'));

    const strapi = createStrapi({
      config: {
        provider: 'strapi-plugin-cloudflare-r2-assets',
        providerOptions,
      },
    });
    const service = createStatusService({ strapi });
    const result = await service.getStatus();

    expect(result.configured).toBe(true);
    expect(result.health?.ok).toBe(false);
    expect(result.health?.detail).toBe('Bucket connectivity check failed. Verify bucket name, endpoint, and credentials.');
    expect(result.health?.detail).not.toContain('secretAccessKey');
    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
  });

  it('returns scoped configuration validation errors', async () => {
    const strapi = createStrapi({
      config: {
        provider: 'strapi-plugin-cloudflare-r2-assets',
        providerOptions: {},
      },
    });

    const service = createStatusService({ strapi });
    const result = await service.getStatus();

    expect(result.configured).toBe(false);
    expect(result.errors[0]).toMatch(/Missing required configuration/);
  });
});

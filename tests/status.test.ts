import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    warn: ReturnType<typeof vi.fn<(message: string) => void>>;
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

const originalEnvPrefix = process.env.CF_R2_ENV_PREFIX;

describe('status service', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  afterEach(() => {
    if (typeof originalEnvPrefix === 'undefined') {
      delete process.env.CF_R2_ENV_PREFIX;
      return;
    }

    process.env.CF_R2_ENV_PREFIX = originalEnvPrefix;
  });

  it('returns sanitized connectivity details when bucket check fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('request failed secretAccessKey=abc123'));

    const strapi = createStrapi({
      provider: 'strapi-plugin-cloudflare-r2-assets',
      providerOptions,
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
    delete process.env.CF_R2_ENV_PREFIX;

    const strapi = createStrapi({
      provider: 'strapi-plugin-cloudflare-r2-assets',
      providerOptions: {},
    });

    const service = createStatusService({ strapi });
    const result = await service.getStatus();

    expect(result.configured).toBe(false);
    expect(result.errors[0]).toMatch(/Missing required configuration/);
    expect(result.warnings[0]).toContain('CF_R2_ENV_PREFIX=CMS_');
  });

  it('handles network timeout errors gracefully', async () => {
    const timeoutError = new Error('connect ETIMEDOUT 192.168.1.1:443');
    timeoutError.name = 'TimeoutError';
    sendMock.mockRejectedValueOnce(timeoutError);

    const strapi = createStrapi({
      provider: 'strapi-plugin-cloudflare-r2-assets',
      providerOptions,
    });
    const service = createStatusService({ strapi });
    const result = await service.getStatus();

    expect(result.configured).toBe(true);
    expect(result.health?.ok).toBe(false);
    expect(result.health?.bucketReachable).toBe(false);
    expect(strapi.log.warn).toHaveBeenCalledTimes(1);
    const warnMessage = strapi.log.warn.mock.calls[0]?.[0] as string;
    expect(warnMessage).toContain('ETIMEDOUT');
  });

  it('returns healthy status when bucket check succeeds', async () => {
    sendMock.mockResolvedValueOnce({});

    const strapi = createStrapi({
      provider: 'strapi-plugin-cloudflare-r2-assets',
      providerOptions,
    });
    const service = createStatusService({ strapi });
    const result = await service.getStatus();

    expect(result.configured).toBe(true);
    expect(result.activeProvider).toBe(true);
    expect(result.health?.ok).toBe(true);
    expect(result.health?.bucketReachable).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config?.bucket).toBe('media');
  });

  it('supports nested upload config shape for compatibility', async () => {
    sendMock.mockResolvedValueOnce({});

    const strapi = createStrapi({
      config: {
        provider: 'strapi-plugin-cloudflare-r2-assets',
        providerOptions,
      },
    });

    const service = createStatusService({ strapi });
    const result = await service.getStatus();

    expect(result.activeProvider).toBe(true);
    expect(result.configured).toBe(true);
  });
});

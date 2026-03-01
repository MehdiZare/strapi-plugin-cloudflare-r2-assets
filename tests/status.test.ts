import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const r2FetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

vi.mock('../src/shared/r2-client', () => ({
  createR2Client: () => ({
    fetch: r2FetchMock,
    endpoint: 'https://acc_12345.r2.cloudflarestorage.com',
    bucket: 'media',
  }),
  buildObjectUrl: (ep: string, b: string, k: string) => `${ep}/${b}/${k}`,
  buildBucketUrl: (ep: string, b: string) => `${ep}/${b}`,
}));

import createStatusService, { resetVersionCache } from '../server/src/services/status';

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

const r2EnvKeys = [
  'CF_R2_ENV_PREFIX',
  'CF_R2_ACCOUNT_ID',
  'CF_R2_BUCKET',
  'CF_R2_ACCESS_KEY_ID',
  'CF_R2_SECRET_ACCESS_KEY',
  'CF_PUBLIC_BASE_URL',
] as const;

const savedEnv: Record<string, string | undefined> = {};
const fetchMock = vi.fn<typeof global.fetch>();

describe('status service', () => {
  beforeEach(() => {
    for (const key of r2EnvKeys) savedEnv[key] = process.env[key];
    r2FetchMock.mockReset();
    r2FetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    fetchMock.mockReset();
    resetVersionCache();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    for (const key of r2EnvKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  it('returns sanitized connectivity details when bucket check fails', async () => {
    r2FetchMock.mockRejectedValueOnce(new Error('request failed secretAccessKey=abc123'));

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
    delete process.env.CF_R2_ACCOUNT_ID;
    delete process.env.CF_R2_BUCKET;
    delete process.env.CF_R2_ACCESS_KEY_ID;
    delete process.env.CF_R2_SECRET_ACCESS_KEY;
    delete process.env.CF_PUBLIC_BASE_URL;

    const strapi = createStrapi({
      provider: 'strapi-plugin-cloudflare-r2-assets',
      providerOptions: {},
    });

    const service = createStatusService({ strapi });
    const result = await service.getStatus();

    expect(result.configured).toBe(false);
    expect(result.errors[0]).toMatch(/Missing required configuration/);
    expect(result.warnings[0]).toContain('CF_R2_ENV_PREFIX=CMS_');
    expect(result.envKeys).toBeDefined();
    expect(result.envKeys!.filter((k) => k.required).every((k) => !k.resolved)).toBe(true);
  });

  it('handles network timeout errors gracefully', async () => {
    const timeoutError = new Error('connect ETIMEDOUT 192.168.1.1:443');
    timeoutError.name = 'TimeoutError';
    r2FetchMock.mockRejectedValueOnce(timeoutError);

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

  it('returns unhealthy status when bucket check returns non-ok HTTP response', async () => {
    r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));

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
    expect(warnMessage).toContain('HTTP 403');
  });

  it('returns healthy status when bucket check succeeds', async () => {
    r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

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
    expect(result.envKeys).toBeDefined();
    expect(result.envKeys!.filter((k) => k.required).every((k) => k.resolved)).toBe(true);
  });

  it('omits envKeys when provider is not active', async () => {
    const strapi = createStrapi({
      provider: 'some-other-provider',
    });
    const service = createStatusService({ strapi });
    const result = await service.getStatus();

    expect(result.activeProvider).toBe(false);
    expect(result.envKeys).toBeUndefined();
  });

  it('supports nested upload config shape for compatibility', async () => {
    r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ version: '0.0.1' })));

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

  describe('version check', () => {
    it('includes versionCheck when npm registry responds successfully', async () => {
      r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ version: '0.2.0' })));

      const strapi = createStrapi({
        provider: 'strapi-plugin-cloudflare-r2-assets',
        providerOptions,
      });
      const service = createStatusService({ strapi });
      const result = await service.getStatus();

      expect(result.versionCheck).toBeDefined();
      expect(result.versionCheck!.currentVersion).toBe('0.0.1');
      expect(result.versionCheck!.latestVersion).toBe('0.2.0');
      expect(result.versionCheck!.updateAvailable).toBe(true);
      expect(result.versionCheck!.checkedAt).toBeDefined();
    });

    it('sets updateAvailable to false when versions match', async () => {
      r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ version: '0.0.1' })));

      const strapi = createStrapi({
        provider: 'strapi-plugin-cloudflare-r2-assets',
        providerOptions,
      });
      const service = createStatusService({ strapi });
      const result = await service.getStatus();

      expect(result.versionCheck).toBeDefined();
      expect(result.versionCheck!.updateAvailable).toBe(false);
    });

    it('returns undefined versionCheck when npm fetch fails', async () => {
      r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
      fetchMock.mockRejectedValueOnce(new Error('network error'));

      const strapi = createStrapi({
        provider: 'strapi-plugin-cloudflare-r2-assets',
        providerOptions,
      });
      const service = createStatusService({ strapi });
      const result = await service.getStatus();

      expect(result.versionCheck).toBeUndefined();
    });

    it('returns undefined versionCheck when npm returns non-ok response', async () => {
      r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
      fetchMock.mockResolvedValueOnce(new Response('not found', { status: 404 }));

      const strapi = createStrapi({
        provider: 'strapi-plugin-cloudflare-r2-assets',
        providerOptions,
      });
      const service = createStatusService({ strapi });
      const result = await service.getStatus();

      expect(result.versionCheck).toBeUndefined();
    });

    it('caches npm registry response and does not fetch again within TTL', async () => {
      r2FetchMock.mockResolvedValue(new Response(null, { status: 200 }));
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ version: '0.2.0' })));

      const strapi = createStrapi({
        provider: 'strapi-plugin-cloudflare-r2-assets',
        providerOptions,
      });
      const service = createStatusService({ strapi });

      await service.getStatus();
      await service.getStatus();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

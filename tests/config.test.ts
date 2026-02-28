import { describe, expect, it } from 'vitest';

import { resolvePluginConfig, toPublicConfig } from '../src/shared/config';

describe('resolvePluginConfig', () => {
  const baseEnv = {
    CF_R2_ACCOUNT_ID: 'acc_12345',
    CF_R2_BUCKET: 'media',
    CF_R2_ACCESS_KEY_ID: 'key_id',
    CF_R2_SECRET_ACCESS_KEY: 'secret_key',
    CF_PUBLIC_BASE_URL: 'https://media.example.com',
  };

  it('applies default formats', () => {
    const result = resolvePluginConfig({}, baseEnv);
    expect(result.formats).toEqual(['webp', 'avif']);
  });

  it('normalizes jpg to jpeg and deduplicates formats', () => {
    const result = resolvePluginConfig({ formats: ['jpg', 'jpeg', 'avif'] }, baseEnv);
    expect(result.formats).toEqual(['jpeg', 'avif']);
  });

  it('throws when required values are missing', () => {
    expect(() => resolvePluginConfig({}, {})).toThrow(/Missing required configuration/);
  });

  it('uses prefixed environment variables when CF_R2_ENV_PREFIX is set', () => {
    const result = resolvePluginConfig(
      {},
      {
        CF_R2_ENV_PREFIX: 'CUSTOM_',
        CUSTOM_CF_R2_ACCOUNT_ID: 'acc_custom',
        CUSTOM_CF_R2_BUCKET: 'bucket_custom',
        CUSTOM_CF_R2_ACCESS_KEY_ID: 'key_custom',
        CUSTOM_CF_R2_SECRET_ACCESS_KEY: 'secret_custom',
        CUSTOM_CF_PUBLIC_BASE_URL: 'https://custom.example.com',
      }
    );

    expect(result.envPrefix).toBe('CUSTOM_');
    expect(result.accountId).toBe('acc_custom');
    expect(result.bucket).toBe('bucket_custom');
  });

  it('normalizes CF_R2_ENV_PREFIX when underscore is omitted', () => {
    const result = resolvePluginConfig(
      {},
      {
        CF_R2_ENV_PREFIX: 'CMS',
        CMS_CF_R2_ACCOUNT_ID: 'acc_cms',
        CMS_CF_R2_BUCKET: 'bucket_cms',
        CMS_CF_R2_ACCESS_KEY_ID: 'key_cms',
        CMS_CF_R2_SECRET_ACCESS_KEY: 'secret_cms',
        CMS_CF_PUBLIC_BASE_URL: 'https://cms.example.com',
      }
    );

    expect(result.envPrefix).toBe('CMS_');
    expect(result.bucket).toBe('bucket_cms');
  });

  it('falls back to unprefixed variables if prefixed ones are missing', () => {
    const result = resolvePluginConfig(
      {},
      {
        ...baseEnv,
        CF_R2_ENV_PREFIX: 'MISSING',
      }
    );

    expect(result.envPrefix).toBe('MISSING_');
    expect(result.accountId).toBe('acc_12345');
    expect(result.bucket).toBe('media');
  });

  it('throws when formats exceed maxFormats', () => {
    expect(() =>
      resolvePluginConfig(
        {
          formats: ['webp', 'avif', 'jpeg'],
          maxFormats: 2,
        },
        baseEnv
      )
    ).toThrow(/exceeds maxFormats/);
  });

  it('throws when CF_IMAGE_QUALITY is not an integer', () => {
    expect(() =>
      resolvePluginConfig({}, {
        ...baseEnv,
        CF_IMAGE_QUALITY: '82abc',
      })
    ).toThrow(/CF_IMAGE_QUALITY must be an integer/);
  });

  it('throws when public base URL is invalid', () => {
    expect(() =>
      resolvePluginConfig(
        {
          publicBaseUrl: 'not a url',
        },
        baseEnv
      )
    ).toThrow(/CF_PUBLIC_BASE_URL must be a valid http\(s\) URL/);
  });
});

describe('toPublicConfig', () => {
  it('masks account ID in the endpoint URL', () => {
    const config = resolvePluginConfig({}, {
      CF_R2_ACCOUNT_ID: 'abc123def456',
      CF_R2_BUCKET: 'media',
      CF_R2_ACCESS_KEY_ID: 'key_id',
      CF_R2_SECRET_ACCESS_KEY: 'secret_key',
      CF_PUBLIC_BASE_URL: 'https://media.example.com',
    });

    const publicConfig = toPublicConfig(config);

    expect(publicConfig.endpoint).toBe('https://****f456.r2.cloudflarestorage.com');
    expect(publicConfig.endpoint).not.toContain('abc123def456');
    expect(publicConfig.accountIdSuffix).toBe('f456');
  });

  it('preserves custom endpoint that does not contain account ID', () => {
    const config = resolvePluginConfig({
      endpoint: 'https://custom-r2.example.com',
    }, {
      CF_R2_ACCOUNT_ID: 'abc123def456',
      CF_R2_BUCKET: 'media',
      CF_R2_ACCESS_KEY_ID: 'key_id',
      CF_R2_SECRET_ACCESS_KEY: 'secret_key',
      CF_PUBLIC_BASE_URL: 'https://media.example.com',
    });

    const publicConfig = toPublicConfig(config);

    expect(publicConfig.endpoint).toBe('https://custom-r2.example.com');
  });
});

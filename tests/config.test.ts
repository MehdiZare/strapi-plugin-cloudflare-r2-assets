import { describe, expect, it } from 'vitest';

import { resolvePluginConfig } from '../src/shared/config';

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

  it('uses prefixed environment variables when envPrefix is provided in provider options', () => {
    const result = resolvePluginConfig(
      {
        envPrefix: 'APP',
      },
      {
        APP_CF_R2_ACCOUNT_ID: 'acc_prefixed',
        APP_CF_R2_BUCKET: 'bucket_prefixed',
        APP_CF_R2_ACCESS_KEY_ID: 'key_prefixed',
        APP_CF_R2_SECRET_ACCESS_KEY: 'secret_prefixed',
        APP_CF_PUBLIC_BASE_URL: 'https://prefixed.example.com',
      }
    );

    expect(result.envPrefix).toBe('APP_');
    expect(result.accountId).toBe('acc_prefixed');
    expect(result.bucket).toBe('bucket_prefixed');
    expect(result.publicBaseUrl).toBe('https://prefixed.example.com');
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

  it('falls back to unprefixed variables if prefixed ones are missing', () => {
    const result = resolvePluginConfig(
      {
        envPrefix: 'MISSING',
      },
      baseEnv
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
});

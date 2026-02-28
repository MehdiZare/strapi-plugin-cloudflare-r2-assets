import { HeadBucketCommand } from '@aws-sdk/client-s3';

import { PLUGIN_ID, PROVIDER_PACKAGE_NAME } from '../../../src/shared/constants';
import { checkEnvKeys, resolvePluginConfig, toPublicConfig } from '../../../src/shared/config';
import { createS3Client } from '../../../src/shared/s3-client';
import type { RawPluginConfig, SettingsStatusResponse } from '../../../src/shared/types';

type StrapiLike = {
  config: {
    get: (key: string, defaultValue?: unknown) => any;
  };
  log?: {
    warn?: (message: string) => void;
  };
};

const redactSecrets = (input: string): string =>
  input
    .replace(/(secret(access)?key|access[_-]?key[_-]?id|token|password)\s*[:=]\s*([^\s,;]+)/gi, '$1=[REDACTED]')
    .replace(/(authorization)\s*[:=]\s*([^\s,;]+)/gi, '$1=[REDACTED]');

const logWarning = (strapi: StrapiLike, message: string, error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  strapi.log?.warn?.(`[${PLUGIN_ID}] ${message}: ${redactSecrets(detail)}`);
};

const toConfigErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Invalid Cloudflare provider configuration.';
  }

  return error.message.startsWith(`[${PLUGIN_ID}]`) ? error.message : 'Invalid Cloudflare provider configuration.';
};

export default ({ strapi }: { strapi: StrapiLike }) => ({
  async getStatus(): Promise<SettingsStatusResponse> {
    const uploadConfig = strapi.config.get('plugin::upload', {}) as {
      provider?: string;
      providerOptions?: RawPluginConfig;
      config?: { provider?: string; providerOptions?: RawPluginConfig };
    };

    const providerName = uploadConfig?.provider ?? uploadConfig?.config?.provider;
    const providerOptions = uploadConfig?.providerOptions ?? uploadConfig?.config?.providerOptions ?? {};
    const activeProvider = providerName === PROVIDER_PACKAGE_NAME || providerName === PLUGIN_ID;

    if (!activeProvider) {
      return {
        pluginId: PLUGIN_ID,
        providerName,
        activeProvider: false,
        configured: false,
        warnings: [
          `Upload provider is currently "${providerName ?? 'not configured'}". Set it to "${PROVIDER_PACKAGE_NAME}".`,
        ],
        errors: [],
      };
    }

    let config: ReturnType<typeof resolvePluginConfig>;

    try {
      config = resolvePluginConfig(providerOptions);
    } catch (error) {
      logWarning(strapi, 'Configuration validation failed', error);
      const message = toConfigErrorMessage(error);
      const isMissingConfig = message.includes('Missing required configuration');
      const warnings =
        isMissingConfig && !process.env.CF_R2_ENV_PREFIX
          ? ['If your Cloudflare vars are prefixed (for example "CMS_"), set CF_R2_ENV_PREFIX=CMS_ and restart Strapi.']
          : [];

      return {
        pluginId: PLUGIN_ID,
        providerName,
        activeProvider: true,
        configured: false,
        warnings,
        errors: [message],
        envKeys: checkEnvKeys(providerOptions),
      };
    }

    const client = createS3Client(config);

    try {
      await client.send(new HeadBucketCommand({ Bucket: config.bucket }));

      return {
        pluginId: PLUGIN_ID,
        providerName,
        activeProvider: true,
        configured: true,
        warnings: [],
        errors: [],
        config: toPublicConfig(config),
        envKeys: checkEnvKeys(providerOptions),
        health: {
          ok: true,
          checkedAt: new Date().toISOString(),
          bucketReachable: true,
          detail: 'Bucket is reachable with current credentials.',
        },
      };
    } catch (error) {
      logWarning(strapi, 'Bucket connectivity check failed', error);

      return {
        pluginId: PLUGIN_ID,
        providerName,
        activeProvider: true,
        configured: true,
        warnings: [],
        errors: [],
        config: toPublicConfig(config),
        envKeys: checkEnvKeys(providerOptions),
        health: {
          ok: false,
          checkedAt: new Date().toISOString(),
          bucketReachable: false,
          detail: 'Bucket connectivity check failed. Verify bucket name, endpoint, and credentials.',
        },
      };
    }
  },
});

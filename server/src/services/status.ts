import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

import { PLUGIN_ID, PROVIDER_PACKAGE_NAME } from '../../../src/shared/constants';
import { resolvePluginConfig, toPublicConfig } from '../../../src/shared/config';
import type { RawPluginConfig, SettingsStatusResponse } from '../../../src/shared/types';

type StrapiLike = {
  config: {
    get: (key: string, defaultValue?: unknown) => any;
  };
};

const createS3Client = (config: ReturnType<typeof resolvePluginConfig>) =>
  new S3Client({
    endpoint: config.endpoint,
    region: 'auto',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

export default ({ strapi }: { strapi: StrapiLike }) => ({
  async getStatus(): Promise<SettingsStatusResponse> {
    const uploadConfig = strapi.config.get('plugin::upload', {}) as {
      config?: { provider?: string; providerOptions?: RawPluginConfig };
    };

    const providerName = uploadConfig?.config?.provider;
    const providerOptions = uploadConfig?.config?.providerOptions ?? {};
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
      return {
        pluginId: PLUGIN_ID,
        providerName,
        activeProvider: true,
        configured: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Invalid Cloudflare provider configuration'],
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
        health: {
          ok: true,
          checkedAt: new Date().toISOString(),
          bucketReachable: true,
          detail: 'Bucket is reachable with current credentials.',
        },
      };
    } catch (error) {
      return {
        pluginId: PLUGIN_ID,
        providerName,
        activeProvider: true,
        configured: true,
        warnings: [],
        errors: [],
        config: toPublicConfig(config),
        health: {
          ok: false,
          checkedAt: new Date().toISOString(),
          bucketReachable: false,
          detail: error instanceof Error ? error.message : 'Could not reach configured bucket.',
        },
      };
    }
  },
});


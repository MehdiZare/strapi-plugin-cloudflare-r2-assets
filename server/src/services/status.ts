import { HeadBucketCommand } from '@aws-sdk/client-s3';

import { PLUGIN_ID, PLUGIN_VERSION, PROVIDER_PACKAGE_NAME } from '../../../src/shared/constants';
import { checkEnvKeys, resolvePluginConfig, toPublicConfig } from '../../../src/shared/config';
import { createS3Client } from '../../../src/shared/s3-client';
import type { RawPluginConfig, SettingsStatusResponse, VersionCheck } from '../../../src/shared/types';

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

let versionCache: { latestVersion: string; fetchedAt: number } | null = null;
const VERSION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const fetchLatestVersion = async (): Promise<string | null> => {
  if (versionCache && Date.now() - versionCache.fetchedAt < VERSION_CACHE_TTL_MS) {
    return versionCache.latestVersion;
  }

  try {
    const response = await fetch(`https://registry.npmjs.org/${PROVIDER_PACKAGE_NAME}/latest`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { version?: string };

    if (typeof data.version !== 'string') {
      return null;
    }

    versionCache = { latestVersion: data.version, fetchedAt: Date.now() };

    return data.version;
  } catch {
    return null;
  }
};

const buildVersionCheck = async (): Promise<VersionCheck | undefined> => {
  const latestVersion = await fetchLatestVersion();

  if (!latestVersion) {
    return undefined;
  }

  return {
    currentVersion: PLUGIN_VERSION,
    latestVersion,
    updateAvailable: latestVersion !== PLUGIN_VERSION,
    checkedAt: new Date().toISOString(),
  };
};

const resetVersionCache = () => {
  versionCache = null;
};

export { versionCache, VERSION_CACHE_TTL_MS, fetchLatestVersion, resetVersionCache };

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

    const versionCheck = await buildVersionCheck();

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
        versionCheck,
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
        versionCheck,
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
        versionCheck,
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
        versionCheck,
      };
    }
  },
});

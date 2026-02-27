import {
  ALLOWED_IMAGE_FORMATS,
  DEFAULT_BASE_PATH,
  DEFAULT_IMAGE_FORMATS,
  DEFAULT_MAX_FORMATS,
  DEFAULT_QUALITY,
  PLUGIN_ID,
} from './constants';
import type { AllowedImageFormat, RawPluginConfig, ResolvedPluginConfig } from './types';

const ALLOWED_FORMAT_SET = new Set<string>(ALLOWED_IMAGE_FORMATS);

const parseInteger = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toTrimmedOrUndefined = (value?: string): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeEnvPrefix = (prefix?: string): string | undefined => {
  if (!prefix) {
    return undefined;
  }

  const trimmed = prefix.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.endsWith('_') ? trimmed : `${trimmed}_`;
};

const normalizeFormat = (format: string): AllowedImageFormat | null => {
  const normalized = format.trim().toLowerCase();
  const alias = normalized === 'jpg' ? 'jpeg' : normalized;

  if (!ALLOWED_FORMAT_SET.has(alias)) {
    return null;
  }

  return alias as AllowedImageFormat;
};

const normalizeFormats = (formats: string[], maxFormats: number): AllowedImageFormat[] => {
  const unique: AllowedImageFormat[] = [];
  const seen = new Set<string>();

  for (const format of formats) {
    const normalized = normalizeFormat(format);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    unique.push(normalized);
    seen.add(normalized);
  }

  if (unique.length === 0) {
    throw new Error(
      `[${PLUGIN_ID}] No valid image formats were configured. Allowed formats: ${ALLOWED_IMAGE_FORMATS.join(', ')}`
    );
  }

  if (unique.length > maxFormats) {
    throw new Error(`[${PLUGIN_ID}] formats length (${unique.length}) exceeds maxFormats (${maxFormats}).`);
  }

  return unique;
};

const maskSuffix = (value: string) => (value.length <= 4 ? value : value.slice(-4));

export const resolvePluginConfig = (options: RawPluginConfig = {}, env: NodeJS.ProcessEnv = process.env): ResolvedPluginConfig => {
  const envPrefix = normalizeEnvPrefix(options.envPrefix ?? toTrimmedOrUndefined(env.CF_R2_ENV_PREFIX));
  const getEnv = (key: string): string | undefined => {
    const prefixed = envPrefix ? toTrimmedOrUndefined(env[`${envPrefix}${key}`]) : undefined;
    return prefixed ?? toTrimmedOrUndefined(env[key]);
  };

  const accountId = toTrimmedOrUndefined(options.accountId) ?? getEnv('CF_R2_ACCOUNT_ID');
  const bucket = toTrimmedOrUndefined(options.bucket) ?? getEnv('CF_R2_BUCKET');
  const accessKeyId = toTrimmedOrUndefined(options.accessKeyId) ?? getEnv('CF_R2_ACCESS_KEY_ID');
  const secretAccessKey =
    toTrimmedOrUndefined(options.secretAccessKey) ?? getEnv('CF_R2_SECRET_ACCESS_KEY');
  const publicBaseUrl = toTrimmedOrUndefined(options.publicBaseUrl) ?? getEnv('CF_PUBLIC_BASE_URL');

  const endpoint =
    toTrimmedOrUndefined(options.endpoint) ??
    getEnv('CF_R2_ENDPOINT') ??
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  const maxFormats = options.maxFormats ?? parseInteger(getEnv('CF_IMAGE_MAX_FORMATS')) ?? DEFAULT_MAX_FORMATS;
  const quality = options.quality ?? parseInteger(getEnv('CF_IMAGE_QUALITY')) ?? DEFAULT_QUALITY;
  const basePath = toTrimmedOrUndefined(options.basePath) ?? getEnv('CF_R2_BASE_PATH') ?? DEFAULT_BASE_PATH;
  const cacheControl = toTrimmedOrUndefined(options.cacheControl) ?? getEnv('CF_R2_CACHE_CONTROL');

  const rawFormats = options.formats ?? getEnv('CF_IMAGE_FORMATS')?.split(',') ?? [...DEFAULT_IMAGE_FORMATS];
  const formats = normalizeFormats(rawFormats, maxFormats);

  const missing: string[] = [];
  const prefixedOrDefault = (key: string) => (envPrefix ? `${envPrefix}${key} or ${key}` : key);
  if (!accountId) missing.push(prefixedOrDefault('CF_R2_ACCOUNT_ID'));
  if (!bucket) missing.push(prefixedOrDefault('CF_R2_BUCKET'));
  if (!accessKeyId) missing.push(prefixedOrDefault('CF_R2_ACCESS_KEY_ID'));
  if (!secretAccessKey) missing.push(prefixedOrDefault('CF_R2_SECRET_ACCESS_KEY'));
  if (!publicBaseUrl) missing.push(prefixedOrDefault('CF_PUBLIC_BASE_URL'));
  if (!endpoint) missing.push(`${prefixedOrDefault('CF_R2_ENDPOINT')} or ${prefixedOrDefault('CF_R2_ACCOUNT_ID')}`);

  if (missing.length > 0) {
    throw new Error(`[${PLUGIN_ID}] Missing required configuration: ${missing.join(', ')}`);
  }

  if (maxFormats < 1 || maxFormats > 10) {
    throw new Error(`[${PLUGIN_ID}] maxFormats must be between 1 and 10.`);
  }

  if (quality < 1 || quality > 100) {
    throw new Error(`[${PLUGIN_ID}] quality must be between 1 and 100.`);
  }

  return {
    envPrefix,
    accountId,
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/g, ''),
    basePath,
    formats,
    quality,
    maxFormats,
    cacheControl,
  };
};

export const toPublicConfig = (config: ResolvedPluginConfig) => {
  return {
    envPrefix: config.envPrefix,
    bucket: config.bucket,
    accountIdSuffix: maskSuffix(config.accountId),
    endpoint: config.endpoint,
    publicBaseUrl: config.publicBaseUrl,
    basePath: config.basePath,
    formats: config.formats,
    quality: config.quality,
    maxFormats: config.maxFormats,
    cacheControl: config.cacheControl,
  };
};

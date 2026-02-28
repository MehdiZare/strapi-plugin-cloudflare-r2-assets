"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const clientS3 = require("@aws-sdk/client-s3");
const PLUGIN_ID = "cloudflare-r2-assets";
const PROVIDER_PACKAGE_NAME = "strapi-plugin-cloudflare-r2-assets";
const PLUGIN_VERSION = "0.0.1";
const SETTINGS_READ_ACTION = `plugin::${PLUGIN_ID}.read`;
const DEFAULT_IMAGE_FORMATS = ["webp", "avif"];
const DEFAULT_QUALITY = 82;
const DEFAULT_MAX_FORMATS = 4;
const DEFAULT_BASE_PATH = "uploads";
const ALLOWED_IMAGE_FORMATS = ["webp", "avif", "jpeg", "png"];
const settings = ({ strapi }) => ({
  async status(ctx) {
    ctx.body = await strapi.plugin(PLUGIN_ID).service("status").getStatus();
  }
});
const controllers = {
  settings
};
const admin = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/settings/status",
      handler: "settings.status",
      config: {
        policies: [
          {
            name: "admin::hasPermissions",
            config: {
              actions: [SETTINGS_READ_ACTION]
            }
          }
        ]
      }
    }
  ]
};
const routes = {
  admin
};
const ALLOWED_FORMAT_SET = new Set(ALLOWED_IMAGE_FORMATS);
const parseInteger = (name, value) => {
  if (!value) {
    return void 0;
  }
  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`[${PLUGIN_ID}] ${name} must be an integer.`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`[${PLUGIN_ID}] ${name} must be a safe integer.`);
  }
  return parsed;
};
const toTrimmedOrUndefined = (value) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
};
const normalizeEnvPrefix = (prefix) => {
  if (!prefix) {
    return void 0;
  }
  const trimmed = prefix.trim();
  if (!trimmed) {
    return void 0;
  }
  return trimmed.endsWith("_") ? trimmed : `${trimmed}_`;
};
const normalizeFormat = (format) => {
  const normalized = format.trim().toLowerCase();
  const alias = normalized === "jpg" ? "jpeg" : normalized;
  if (!ALLOWED_FORMAT_SET.has(alias)) {
    return null;
  }
  return alias;
};
const normalizeFormats = (formats, maxFormats) => {
  const unique = [];
  const seen = /* @__PURE__ */ new Set();
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
      `[${PLUGIN_ID}] No valid image formats were configured. Allowed formats: ${ALLOWED_IMAGE_FORMATS.join(", ")}`
    );
  }
  if (unique.length > maxFormats) {
    throw new Error(`[${PLUGIN_ID}] formats length (${unique.length}) exceeds maxFormats (${maxFormats}).`);
  }
  return unique;
};
const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};
const maskSuffix = (value) => value.length <= 4 ? value : value.slice(-4);
const assertPresent = (value, key) => {
  if (!value) {
    throw new Error(`[${PLUGIN_ID}] Missing required configuration: ${key}`);
  }
  return value;
};
const resolvePluginConfig = (options = {}, env = process.env) => {
  const envPrefix = normalizeEnvPrefix(toTrimmedOrUndefined(env.CF_R2_ENV_PREFIX));
  const getEnv = (key) => {
    const prefixed = envPrefix ? toTrimmedOrUndefined(env[`${envPrefix}${key}`]) : void 0;
    return prefixed ?? toTrimmedOrUndefined(env[key]);
  };
  const accountId = toTrimmedOrUndefined(options.accountId) ?? getEnv("CF_R2_ACCOUNT_ID");
  const bucket = toTrimmedOrUndefined(options.bucket) ?? getEnv("CF_R2_BUCKET");
  const accessKeyId = toTrimmedOrUndefined(options.accessKeyId) ?? getEnv("CF_R2_ACCESS_KEY_ID");
  const secretAccessKey = toTrimmedOrUndefined(options.secretAccessKey) ?? getEnv("CF_R2_SECRET_ACCESS_KEY");
  const publicBaseUrl = toTrimmedOrUndefined(options.publicBaseUrl) ?? getEnv("CF_PUBLIC_BASE_URL");
  const endpoint = toTrimmedOrUndefined(options.endpoint) ?? getEnv("CF_R2_ENDPOINT") ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : void 0);
  const maxFormats = options.maxFormats ?? parseInteger("CF_IMAGE_MAX_FORMATS", getEnv("CF_IMAGE_MAX_FORMATS")) ?? DEFAULT_MAX_FORMATS;
  const quality = options.quality ?? parseInteger("CF_IMAGE_QUALITY", getEnv("CF_IMAGE_QUALITY")) ?? DEFAULT_QUALITY;
  const basePath = toTrimmedOrUndefined(options.basePath) ?? getEnv("CF_R2_BASE_PATH") ?? DEFAULT_BASE_PATH;
  const cacheControl = toTrimmedOrUndefined(options.cacheControl) ?? getEnv("CF_R2_CACHE_CONTROL");
  const rawFormats = options.formats ?? getEnv("CF_IMAGE_FORMATS")?.split(",") ?? [...DEFAULT_IMAGE_FORMATS];
  const formats = normalizeFormats(rawFormats, maxFormats);
  const missing = [];
  const prefixedOrDefault = (key) => envPrefix ? `${envPrefix}${key} or ${key}` : key;
  if (!accountId) missing.push(prefixedOrDefault("CF_R2_ACCOUNT_ID"));
  if (!bucket) missing.push(prefixedOrDefault("CF_R2_BUCKET"));
  if (!accessKeyId) missing.push(prefixedOrDefault("CF_R2_ACCESS_KEY_ID"));
  if (!secretAccessKey) missing.push(prefixedOrDefault("CF_R2_SECRET_ACCESS_KEY"));
  if (!publicBaseUrl) missing.push(prefixedOrDefault("CF_PUBLIC_BASE_URL"));
  if (!endpoint) missing.push(`${prefixedOrDefault("CF_R2_ENDPOINT")} or ${prefixedOrDefault("CF_R2_ACCOUNT_ID")}`);
  if (missing.length > 0) {
    throw new Error(`[${PLUGIN_ID}] Missing required configuration: ${missing.join(", ")}`);
  }
  if (!Number.isInteger(maxFormats)) {
    throw new Error(`[${PLUGIN_ID}] maxFormats must be an integer.`);
  }
  if (!Number.isInteger(quality)) {
    throw new Error(`[${PLUGIN_ID}] quality must be an integer.`);
  }
  if (maxFormats < 1 || maxFormats > 10) {
    throw new Error(`[${PLUGIN_ID}] maxFormats must be between 1 and 10.`);
  }
  if (quality < 1 || quality > 100) {
    throw new Error(`[${PLUGIN_ID}] quality must be between 1 and 100.`);
  }
  const resolvedAccountId = assertPresent(accountId, "CF_R2_ACCOUNT_ID");
  const resolvedBucket = assertPresent(bucket, "CF_R2_BUCKET");
  const resolvedEndpoint = assertPresent(endpoint, "CF_R2_ENDPOINT");
  const resolvedAccessKeyId = assertPresent(accessKeyId, "CF_R2_ACCESS_KEY_ID");
  const resolvedSecretAccessKey = assertPresent(secretAccessKey, "CF_R2_SECRET_ACCESS_KEY");
  const resolvedPublicBaseUrl = assertPresent(publicBaseUrl, "CF_PUBLIC_BASE_URL");
  if (!isValidHttpUrl(resolvedPublicBaseUrl)) {
    throw new Error(`[${PLUGIN_ID}] CF_PUBLIC_BASE_URL must be a valid http(s) URL.`);
  }
  if (!isValidHttpUrl(resolvedEndpoint)) {
    throw new Error(`[${PLUGIN_ID}] CF_R2_ENDPOINT must be a valid http(s) URL.`);
  }
  return {
    envPrefix,
    accountId: resolvedAccountId,
    bucket: resolvedBucket,
    endpoint: resolvedEndpoint,
    accessKeyId: resolvedAccessKeyId,
    secretAccessKey: resolvedSecretAccessKey,
    publicBaseUrl: resolvedPublicBaseUrl.replace(/\/+$/g, ""),
    basePath,
    formats,
    quality,
    maxFormats,
    cacheControl
  };
};
const maskEndpointAccountId = (endpoint, accountId) => {
  if (!accountId || !endpoint.includes(accountId)) {
    return endpoint;
  }
  const masked = `****${maskSuffix(accountId)}`;
  return endpoint.replace(accountId, masked);
};
const toPublicConfig = (config) => {
  return {
    envPrefix: config.envPrefix,
    bucket: config.bucket,
    accountIdSuffix: maskSuffix(config.accountId),
    endpoint: maskEndpointAccountId(config.endpoint, config.accountId),
    publicBaseUrl: config.publicBaseUrl,
    basePath: config.basePath,
    formats: config.formats,
    quality: config.quality,
    maxFormats: config.maxFormats,
    cacheControl: config.cacheControl
  };
};
const ENV_KEY_DESCRIPTIONS = {
  CF_R2_ACCOUNT_ID: "Cloudflare account ID",
  CF_R2_BUCKET: "R2 bucket name",
  CF_R2_ACCESS_KEY_ID: "R2 API access key ID",
  CF_R2_SECRET_ACCESS_KEY: "R2 API secret access key",
  CF_PUBLIC_BASE_URL: "Public URL for serving uploaded assets",
  CF_R2_ENDPOINT: "R2 S3-compatible endpoint URL (auto-derived from account ID if omitted)",
  CF_R2_BASE_PATH: "Object key prefix inside the bucket",
  CF_R2_CACHE_CONTROL: "Cache-Control header for uploaded objects",
  CF_IMAGE_FORMATS: "Comma-separated image output formats (e.g. webp,avif)",
  CF_IMAGE_QUALITY: "Image compression quality (1–100)",
  CF_IMAGE_MAX_FORMATS: "Maximum number of image format variants (1–10)"
};
const REQUIRED_ENV_KEYS = [
  "CF_R2_ACCOUNT_ID",
  "CF_R2_BUCKET",
  "CF_R2_ACCESS_KEY_ID",
  "CF_R2_SECRET_ACCESS_KEY",
  "CF_PUBLIC_BASE_URL"
];
const OPTIONAL_ENV_KEYS = [
  "CF_R2_ENDPOINT",
  "CF_R2_BASE_PATH",
  "CF_R2_CACHE_CONTROL",
  "CF_IMAGE_FORMATS",
  "CF_IMAGE_QUALITY",
  "CF_IMAGE_MAX_FORMATS"
];
const hasConfiguredValue = (value) => {
  if (typeof value === "string") {
    return toTrimmedOrUndefined(value) !== void 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== void 0 && value !== null;
};
const checkEnvKeys = (options = {}, env = process.env) => {
  const envPrefix = normalizeEnvPrefix(toTrimmedOrUndefined(env.CF_R2_ENV_PREFIX));
  const getEnv = (key) => {
    const prefixed = envPrefix ? toTrimmedOrUndefined(env[`${envPrefix}${key}`]) : void 0;
    return prefixed ?? toTrimmedOrUndefined(env[key]);
  };
  const optionKeyMap = {
    CF_R2_ACCOUNT_ID: "accountId",
    CF_R2_BUCKET: "bucket",
    CF_R2_ACCESS_KEY_ID: "accessKeyId",
    CF_R2_SECRET_ACCESS_KEY: "secretAccessKey",
    CF_PUBLIC_BASE_URL: "publicBaseUrl",
    CF_R2_ENDPOINT: "endpoint",
    CF_R2_BASE_PATH: "basePath",
    CF_R2_CACHE_CONTROL: "cacheControl",
    CF_IMAGE_FORMATS: "formats",
    CF_IMAGE_QUALITY: "quality",
    CF_IMAGE_MAX_FORMATS: "maxFormats"
  };
  const isResolved = (key) => {
    const optKey = optionKeyMap[key];
    if (optKey && hasConfiguredValue(options[optKey])) {
      return true;
    }
    if (getEnv(key) !== void 0) {
      return true;
    }
    if (key === "CF_R2_ENDPOINT") {
      const accountIdOpt = optionKeyMap["CF_R2_ACCOUNT_ID"];
      return hasConfiguredValue(options[accountIdOpt]) || getEnv("CF_R2_ACCOUNT_ID") !== void 0;
    }
    return false;
  };
  const toInfo = (key, required) => ({
    key,
    description: ENV_KEY_DESCRIPTIONS[key] ?? key,
    required,
    resolved: isResolved(key),
    ...envPrefix ? { prefixedKey: `${envPrefix}${key}` } : {}
  });
  return [
    ...REQUIRED_ENV_KEYS.map((k) => toInfo(k, true)),
    ...OPTIONAL_ENV_KEYS.map((k) => toInfo(k, false))
  ];
};
const createS3Client = (config) => new clientS3.S3Client({
  endpoint: config.endpoint,
  region: "auto",
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
  }
});
const redactSecrets = (input) => input.replace(/(secret(access)?key|access[_-]?key[_-]?id|token|password)\s*[:=]\s*([^\s,;]+)/gi, "$1=[REDACTED]").replace(/(authorization)\s*[:=]\s*([^\s,;]+)/gi, "$1=[REDACTED]");
const logWarning = (strapi, message, error) => {
  const detail = error instanceof Error ? error.message : String(error);
  strapi.log?.warn?.(`[${PLUGIN_ID}] ${message}: ${redactSecrets(detail)}`);
};
const toConfigErrorMessage = (error) => {
  if (!(error instanceof Error)) {
    return "Invalid Cloudflare provider configuration.";
  }
  return error.message.startsWith(`[${PLUGIN_ID}]`) ? error.message : "Invalid Cloudflare provider configuration.";
};
let versionCache = null;
const VERSION_CACHE_TTL_MS = 60 * 60 * 1e3;
const fetchLatestVersion = async () => {
  if (versionCache && Date.now() - versionCache.fetchedAt < VERSION_CACHE_TTL_MS) {
    return versionCache.latestVersion;
  }
  try {
    const response = await fetch(`https://registry.npmjs.org/${PROVIDER_PACKAGE_NAME}/latest`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (typeof data.version !== "string") {
      return null;
    }
    versionCache = { latestVersion: data.version, fetchedAt: Date.now() };
    return data.version;
  } catch {
    return null;
  }
};
const buildVersionCheck = async () => {
  const latestVersion = await fetchLatestVersion();
  if (!latestVersion) {
    return void 0;
  }
  return {
    currentVersion: PLUGIN_VERSION,
    latestVersion,
    updateAvailable: latestVersion !== PLUGIN_VERSION,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
};
const status = ({ strapi }) => ({
  async getStatus() {
    const uploadConfig = strapi.config.get("plugin::upload", {});
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
          `Upload provider is currently "${providerName ?? "not configured"}". Set it to "${PROVIDER_PACKAGE_NAME}".`
        ],
        errors: [],
        versionCheck
      };
    }
    let config;
    try {
      config = resolvePluginConfig(providerOptions);
    } catch (error) {
      logWarning(strapi, "Configuration validation failed", error);
      const message = toConfigErrorMessage(error);
      const isMissingConfig = message.includes("Missing required configuration");
      const warnings = isMissingConfig && !process.env.CF_R2_ENV_PREFIX ? ['If your Cloudflare vars are prefixed (for example "CMS_"), set CF_R2_ENV_PREFIX=CMS_ and restart Strapi.'] : [];
      return {
        pluginId: PLUGIN_ID,
        providerName,
        activeProvider: true,
        configured: false,
        warnings,
        errors: [message],
        envKeys: checkEnvKeys(providerOptions),
        versionCheck
      };
    }
    const client = createS3Client(config);
    try {
      await client.send(new clientS3.HeadBucketCommand({ Bucket: config.bucket }));
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
          checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
          bucketReachable: true,
          detail: "Bucket is reachable with current credentials."
        },
        versionCheck
      };
    } catch (error) {
      logWarning(strapi, "Bucket connectivity check failed", error);
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
          checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
          bucketReachable: false,
          detail: "Bucket connectivity check failed. Verify bucket name, endpoint, and credentials."
        },
        versionCheck
      };
    }
  }
});
const services = {
  status
};
const index = () => {
  return {
    register({ strapi } = {}) {
      strapi?.admin?.services?.permission?.actionProvider?.registerMany?.([
        {
          section: "plugins",
          displayName: "Read",
          uid: "read",
          pluginName: PLUGIN_ID
        }
      ]);
    },
    bootstrap() {
    },
    controllers,
    routes,
    services
  };
};
exports.default = index;

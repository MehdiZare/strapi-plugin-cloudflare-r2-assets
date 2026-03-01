"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const node_stream = require("node:stream");
const aws4fetch = require("aws4fetch");
const PLUGIN_ID = "cloudflare-r2-assets";
const PROVIDER_PACKAGE_NAME = "strapi-plugin-cloudflare-r2-assets";
const DEFAULT_BASE_PATH = "uploads";
const DEFAULT_REQUEST_TIMEOUT_MS = 3e4;
const DEFAULT_MAX_UPLOAD_BUFFER_BYTES = 100 * 1024 * 1024;
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
const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};
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
  const basePath = toTrimmedOrUndefined(options.basePath) ?? getEnv("CF_R2_BASE_PATH") ?? DEFAULT_BASE_PATH;
  const cacheControl = toTrimmedOrUndefined(options.cacheControl) ?? getEnv("CF_R2_CACHE_CONTROL");
  const requestTimeout = options.requestTimeout ?? parseInteger("CF_R2_REQUEST_TIMEOUT", getEnv("CF_R2_REQUEST_TIMEOUT")) ?? DEFAULT_REQUEST_TIMEOUT_MS;
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
  if (!Number.isInteger(requestTimeout) || requestTimeout < 1) {
    throw new Error(`[${PLUGIN_ID}] requestTimeout must be a positive integer.`);
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
    cacheControl,
    requestTimeout,
    maxUploadBufferBytes: options.maxUploadBufferBytes
  };
};
const trimSlash = (value) => value.replace(/^\/+|\/+$/g, "");
const normalizePathname = (value) => {
  const normalized = value.replace(/\/+/g, "/");
  if (!normalized) {
    return "/";
  }
  if (normalized === "/") {
    return "/";
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};
const sanitizePathSegment = (value) => {
  if (!value) {
    return "";
  }
  const sanitized = trimSlash(value).replace(/\.\.+/g, "").replace(/\\/g, "/").replace(/\/+/g, "/");
  return trimSlash(sanitized);
};
const normalizeObjectKey = (value) => {
  const normalized = sanitizePathSegment(value);
  return normalized.length > 0 ? normalized : null;
};
const buildObjectKey = (basePath, nestedPath, filename) => {
  const safeBase = sanitizePathSegment(basePath);
  const safeNested = sanitizePathSegment(nestedPath);
  const safeFile = trimSlash(filename);
  return [safeBase, safeNested, safeFile].filter(Boolean).join("/");
};
const extractObjectKeyFromPublicUrl = (publicBaseUrl, fileUrl) => {
  if (!fileUrl) {
    return null;
  }
  let baseUrl;
  let parsedFileUrl;
  try {
    baseUrl = new URL(publicBaseUrl);
    parsedFileUrl = new URL(fileUrl);
  } catch {
    return null;
  }
  if (baseUrl.origin !== parsedFileUrl.origin) {
    return null;
  }
  const basePath = normalizePathname(baseUrl.pathname);
  const filePath = normalizePathname(parsedFileUrl.pathname);
  const normalizedBase = basePath === "/" ? "" : basePath;
  if (normalizedBase.length > 0) {
    if (filePath === normalizedBase) {
      return null;
    }
    if (!filePath.startsWith(`${normalizedBase}/`)) {
      return null;
    }
  }
  const remainder = filePath.slice(normalizedBase.length);
  const key = normalizeObjectKey(remainder);
  if (!key) {
    return null;
  }
  return key;
};
const createR2Client = (config) => {
  const aws = new aws4fetch.AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto"
  });
  const endpoint = config.endpoint.replace(/\/+$/, "");
  const timeoutMs = config.requestTimeout;
  return {
    fetch: (url, init2) => {
      const signal = init2?.signal ?? AbortSignal.timeout(timeoutMs);
      return aws.fetch(url, { ...init2, signal });
    },
    endpoint,
    bucket: config.bucket
  };
};
const buildObjectUrl = (endpoint, bucket, key) => `${endpoint}/${bucket}/${key}`;
const buildBucketUrl = (endpoint, bucket) => `${endpoint}/${bucket}`;
const stripTrailingSlash = (value) => value.replace(/\/+$/g, "");
const ensureLeadingSlash = (value) => value.startsWith("/") ? value : `/${value}`;
const buildPublicObjectUrl = (publicBaseUrl, objectKey) => {
  return `${stripTrailingSlash(publicBaseUrl)}${ensureLeadingSlash(objectKey)}`;
};
const initProvider = (options = {}) => {
  const config = resolvePluginConfig(options);
  const client = createR2Client(config);
  return { client, config };
};
const resolveBody = (file) => {
  if (file.buffer) {
    return file.buffer;
  }
  if (file.stream) {
    return node_stream.Readable.toWeb(file.stream);
  }
  throw new Error(`[${PLUGIN_ID}] File is missing both "buffer" and "stream".`);
};
const resolveObjectKey = (file, basePath) => {
  const ext = file.ext ?? "";
  return buildObjectKey(basePath, file.path, `${file.hash}${ext}`);
};
const provider = {
  init(providerOptions = {}) {
    const { client, config } = initProvider(providerOptions);
    const upload = async (file) => {
      const objectKey = resolveObjectKey(file, config.basePath);
      const body = resolveBody(file);
      const url = buildObjectUrl(client.endpoint, config.bucket, objectKey);
      const headers = { "Content-Type": file.mime };
      if (config.cacheControl) headers["Cache-Control"] = config.cacheControl;
      let response;
      try {
        response = await client.fetch(url, {
          method: "PUT",
          headers,
          body,
          duplex: "half"
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`[${PLUGIN_ID}] Failed to upload object "${objectKey}" to bucket "${config.bucket}": ${detail}`, { cause: error });
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`[${PLUGIN_ID}] Failed to upload object "${objectKey}" to bucket "${config.bucket}": HTTP ${response.status}${text ? `: ${text}` : ""}`);
      }
      const sourceUrl = buildPublicObjectUrl(config.publicBaseUrl, objectKey);
      file.url = sourceUrl;
      file.provider = PROVIDER_PACKAGE_NAME;
      file.provider_metadata = {
        bucket: config.bucket,
        key: objectKey
      };
    };
    return {
      async upload(file) {
        await upload(file);
      },
      async uploadStream(file) {
        if (file.stream && !file.buffer) {
          const maxBufferBytes = config.maxUploadBufferBytes ?? DEFAULT_MAX_UPLOAD_BUFFER_BYTES;
          const chunks = [];
          let totalBytes = 0;
          try {
            for await (const chunk of file.stream) {
              const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              totalBytes += buf.length;
              if (totalBytes > maxBufferBytes) {
                break;
              }
              chunks.push(buf);
            }
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            throw new Error(`[${PLUGIN_ID}] Failed to buffer upload stream for "${file.name}": ${detail}`, { cause: error });
          }
          if (totalBytes > maxBufferBytes) {
            throw new Error(`[${PLUGIN_ID}] Upload stream for "${file.name}" exceeded maximum buffer size of ${maxBufferBytes} bytes`);
          }
          file.buffer = Buffer.concat(chunks);
          file.stream = void 0;
        }
        await upload(file);
      },
      async delete(file) {
        const metadataKey = typeof file.provider_metadata?.key === "string" ? normalizeObjectKey(file.provider_metadata.key) : null;
        const keyFromUrl = extractObjectKeyFromPublicUrl(config.publicBaseUrl, file.url);
        const objectKey = metadataKey ?? keyFromUrl;
        if (!objectKey) {
          return;
        }
        const url = buildObjectUrl(client.endpoint, config.bucket, objectKey);
        let response;
        try {
          response = await client.fetch(url, { method: "DELETE" });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          console.warn(`[${PLUGIN_ID}] Failed to delete object "${objectKey}" from bucket "${config.bucket}": ${detail}`);
          return;
        }
        if (!response.ok && response.status !== 404) {
          const text = await response.text().catch(() => "");
          console.warn(`[${PLUGIN_ID}] Failed to delete object "${objectKey}" from bucket "${config.bucket}": HTTP ${response.status}${text ? `: ${text}` : ""}`);
        }
      },
      isPrivate() {
        return false;
      },
      async getSignedUrl(file) {
        return file;
      },
      async healthCheck() {
        const url = buildBucketUrl(client.endpoint, config.bucket);
        let response;
        try {
          response = await client.fetch(url, { method: "HEAD" });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          throw new Error(`[${PLUGIN_ID}] Health check failed for bucket "${config.bucket}": ${detail}`, { cause: error });
        }
        if (!response.ok) {
          throw new Error(`[${PLUGIN_ID}] Health check failed for bucket "${config.bucket}": HTTP ${response.status}`);
        }
      }
    };
  }
};
const { init } = provider;
exports.default = provider;
exports.init = init;

import { S3Client, HeadBucketCommand, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
const PLUGIN_ID = "cloudflare-r2-assets";
const PROVIDER_PACKAGE_NAME = "strapi-plugin-cloudflare-r2-assets";
const DEFAULT_IMAGE_FORMATS = ["webp", "avif"];
const DEFAULT_QUALITY = 82;
const DEFAULT_MAX_FORMATS = 4;
const DEFAULT_BASE_PATH = "uploads";
const ALLOWED_IMAGE_FORMATS = ["webp", "avif", "jpeg", "png"];
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
const isCloudflareTransformUrl = (fileUrl) => {
  if (!fileUrl) return false;
  try {
    return new URL(fileUrl).pathname.includes("/cdn-cgi/image/");
  } catch {
    return false;
  }
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
const createS3Client = (config) => new S3Client({
  endpoint: config.endpoint,
  region: "auto",
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
  }
});
const stripTrailingSlash = (value) => value.replace(/\/+$/g, "");
const ensureLeadingSlash = (value) => value.startsWith("/") ? value : `/${value}`;
const buildPublicObjectUrl = (publicBaseUrl, objectKey) => {
  return `${stripTrailingSlash(publicBaseUrl)}${ensureLeadingSlash(objectKey)}`;
};
const buildResizedUrl = (config, sourceUrl, format) => {
  const params = [`format=${format}`, `quality=${config.quality}`].join(",");
  const normalizedBase = stripTrailingSlash(config.publicBaseUrl);
  const localPath = sourceUrl.startsWith(normalizedBase) ? ensureLeadingSlash(sourceUrl.slice(normalizedBase.length)) : sourceUrl;
  const sourceSegment = localPath.startsWith("/") ? localPath : `/${localPath}`;
  return `${normalizedBase}/cdn-cgi/image/${params}${sourceSegment}`;
};
const isImageMimeType = (mime) => mime.toLowerCase().startsWith("image/");
const initProvider = (options = {}) => {
  const config = resolvePluginConfig(options);
  const client = createS3Client(config);
  return { client, config };
};
const buildDerivedFormats = (file, sourceUrl, options) => {
  if (!isImageMimeType(file.mime)) {
    return void 0;
  }
  return Object.fromEntries(
    options.formats.map((format) => {
      const ext = format === "jpeg" ? ".jpg" : `.${format}`;
      const mime = format === "jpeg" ? "image/jpeg" : `image/${format}`;
      return [
        format,
        {
          ext,
          mime,
          hash: `${file.hash}_${format}`,
          name: `${file.hash}_${format}${ext}`,
          size: file.size,
          width: file.width,
          height: file.height,
          url: buildResizedUrl(options, sourceUrl, format)
        }
      ];
    })
  );
};
const resolveBody = (file) => {
  if (file.buffer) {
    return file.buffer;
  }
  if (file.stream) {
    return file.stream;
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
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: objectKey,
            Body: body,
            ContentType: file.mime,
            CacheControl: config.cacheControl
          })
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`[${PLUGIN_ID}] Failed to upload object "${objectKey}" to bucket "${config.bucket}": ${detail}`, { cause: error });
      }
      const sourceUrl = buildPublicObjectUrl(config.publicBaseUrl, objectKey);
      file.url = sourceUrl;
      file.provider = PROVIDER_PACKAGE_NAME;
      file.provider_metadata = {
        bucket: config.bucket,
        key: objectKey
      };
      file.formats = buildDerivedFormats(file, sourceUrl, config);
    };
    return {
      async upload(file) {
        await upload(file);
      },
      async uploadStream(file) {
        await upload(file);
      },
      async delete(file) {
        if (!file.provider_metadata && isCloudflareTransformUrl(file.url)) {
          return;
        }
        const metadataKey = typeof file.provider_metadata?.key === "string" ? normalizeObjectKey(file.provider_metadata.key) : null;
        const keyFromUrl = extractObjectKeyFromPublicUrl(config.publicBaseUrl, file.url);
        const objectKey = metadataKey ?? keyFromUrl;
        if (!objectKey) {
          return;
        }
        try {
          await client.send(
            new DeleteObjectCommand({
              Bucket: config.bucket,
              Key: objectKey
            })
          );
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          console.warn(`[${PLUGIN_ID}] Failed to delete object "${objectKey}" from bucket "${config.bucket}": ${detail}`);
        }
      },
      isPrivate() {
        return false;
      },
      async getSignedUrl(file) {
        return file;
      },
      async healthCheck() {
        try {
          await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          throw new Error(`[${PLUGIN_ID}] Health check failed for bucket "${config.bucket}": ${detail}`, { cause: error });
        }
      }
    };
  }
};
const { init } = provider;
export {
  provider as default,
  init
};

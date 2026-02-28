const trimSlash = (value: string) => value.replace(/^\/+|\/+$/g, '');
const normalizePathname = (value: string) => {
  const normalized = value.replace(/\/+/g, '/');
  if (!normalized) {
    return '/';
  }

  if (normalized === '/') {
    return '/';
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

export const sanitizePathSegment = (value?: string): string => {
  if (!value) {
    return '';
  }

  const sanitized = trimSlash(value)
    .replace(/\.\.+/g, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');

  return trimSlash(sanitized);
};

export const normalizeObjectKey = (value?: string): string | null => {
  const normalized = sanitizePathSegment(value);
  return normalized.length > 0 ? normalized : null;
};

export const buildObjectKey = (basePath: string, nestedPath: string | undefined, filename: string): string => {
  const safeBase = sanitizePathSegment(basePath);
  const safeNested = sanitizePathSegment(nestedPath);
  const safeFile = trimSlash(filename);

  return [safeBase, safeNested, safeFile].filter(Boolean).join('/');
};

export const isCloudflareTransformUrl = (fileUrl?: string): boolean => {
  if (!fileUrl) return false;
  try {
    return new URL(fileUrl).pathname.includes('/cdn-cgi/image/');
  } catch {
    return false;
  }
};

export const extractObjectKeyFromPublicUrl = (publicBaseUrl: string, fileUrl?: string): string | null => {
  if (!fileUrl) {
    return null;
  }

  let baseUrl: URL;
  let parsedFileUrl: URL;

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
  const normalizedBase = basePath === '/' ? '' : basePath;

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

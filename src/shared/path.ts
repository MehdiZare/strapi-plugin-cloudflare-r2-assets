const trimSlash = (value: string) => value.replace(/^\/+|\/+$/g, '');

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

export const buildObjectKey = (basePath: string, nestedPath: string | undefined, filename: string): string => {
  const safeBase = sanitizePathSegment(basePath);
  const safeNested = sanitizePathSegment(nestedPath);
  const safeFile = trimSlash(filename);

  return [safeBase, safeNested, safeFile].filter(Boolean).join('/');
};

export const extractObjectKeyFromPublicUrl = (publicBaseUrl: string, fileUrl?: string): string | null => {
  if (!fileUrl) {
    return null;
  }

  const normalizedBase = trimSlash(publicBaseUrl);
  const normalizedUrl = fileUrl.trim().split('?')[0]?.split('#')[0] ?? '';

  if (!normalizedUrl.startsWith(normalizedBase)) {
    return null;
  }

  const remainder = normalizedUrl.slice(normalizedBase.length);
  return sanitizePathSegment(remainder);
};

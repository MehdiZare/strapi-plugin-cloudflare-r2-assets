import type { AllowedImageFormat, ResolvedPluginConfig } from './types';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/g, '');
const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

export const buildPublicObjectUrl = (publicBaseUrl: string, objectKey: string): string => {
  return `${stripTrailingSlash(publicBaseUrl)}${ensureLeadingSlash(objectKey)}`;
};

export const buildResizedUrl = (
  config: Pick<ResolvedPluginConfig, 'publicBaseUrl' | 'quality'>,
  sourceUrl: string,
  format: AllowedImageFormat
): string => {
  const params = [`format=${format}`, `quality=${config.quality}`].join(',');
  const normalizedBase = stripTrailingSlash(config.publicBaseUrl);

  const localPath = sourceUrl.startsWith(normalizedBase) ? ensureLeadingSlash(sourceUrl.slice(normalizedBase.length)) : sourceUrl;
  const sourceSegment = localPath.startsWith('/') ? localPath : `/${localPath}`;

  return `${normalizedBase}/cdn-cgi/image/${params}${sourceSegment}`;
};

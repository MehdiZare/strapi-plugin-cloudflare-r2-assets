const stripTrailingSlash = (value: string) => value.replace(/\/+$/g, '');
const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

export const buildPublicObjectUrl = (publicBaseUrl: string, objectKey: string): string => {
  return `${stripTrailingSlash(publicBaseUrl)}${ensureLeadingSlash(objectKey)}`;
};

export const PLUGIN_ID = 'cloudflare-r2-assets';
export const PROVIDER_PACKAGE_NAME = 'strapi-plugin-cloudflare-r2-assets';
export const PLUGIN_VERSION = '0.0.1';
export const SETTINGS_READ_ACTION = `plugin::${PLUGIN_ID}.read`;

export const DEFAULT_IMAGE_FORMATS = ['webp', 'avif'] as const;
export const DEFAULT_QUALITY = 82;
export const DEFAULT_MAX_FORMATS = 4;
export const DEFAULT_BASE_PATH = 'uploads';

export const ALLOWED_IMAGE_FORMATS = ['webp', 'avif', 'jpeg', 'png'] as const;

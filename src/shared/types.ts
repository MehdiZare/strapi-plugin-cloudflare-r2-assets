import type { Readable } from 'node:stream';

export type AllowedImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';

export interface ProviderUploadFile {
  name: string;
  hash: string;
  ext?: string;
  mime: string;
  size: number;
  sizeInBytes?: number;
  width?: number;
  height?: number;
  path?: string;
  url: string;
  stream?: Readable;
  buffer?: Buffer;
  formats?: Record<string, unknown>;
  provider?: string;
  provider_metadata?: Record<string, unknown>;
}

export interface RawPluginConfig {
  envPrefix?: string;
  accountId?: string;
  bucket?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
  basePath?: string;
  formats?: string[];
  quality?: number;
  maxFormats?: number;
  cacheControl?: string;
}

export interface ResolvedPluginConfig {
  envPrefix?: string;
  accountId: string;
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  basePath: string;
  formats: AllowedImageFormat[];
  quality: number;
  maxFormats: number;
  cacheControl?: string;
}

export interface SettingsStatusResponse {
  pluginId: string;
  providerName?: string;
  activeProvider: boolean;
  configured: boolean;
  errors: string[];
  warnings: string[];
  config?: {
    envPrefix?: string;
    bucket: string;
    accountIdSuffix: string;
    endpoint: string;
    publicBaseUrl: string;
    basePath: string;
    formats: AllowedImageFormat[];
    quality: number;
    maxFormats: number;
    cacheControl?: string;
  };
  health?: {
    ok: boolean;
    checkedAt: string;
    bucketReachable: boolean;
    detail?: string;
  };
}

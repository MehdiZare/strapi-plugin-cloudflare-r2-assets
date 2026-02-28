import type { Readable } from 'node:stream';

import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { PLUGIN_ID, PROVIDER_PACKAGE_NAME } from '../shared/constants';
import { resolvePluginConfig } from '../shared/config';
import { buildObjectKey, extractObjectKeyFromPublicUrl, isCloudflareTransformUrl, normalizeObjectKey } from '../shared/path';
import { createS3Client } from '../shared/s3-client';
import type { ProviderUploadFile, RawPluginConfig } from '../shared/types';
import { buildPublicObjectUrl, buildResizedUrl } from '../shared/url-builder';

const isImageMimeType = (mime: string): boolean => mime.toLowerCase().startsWith('image/');

const initProvider = (options: RawPluginConfig = {}) => {
  const config = resolvePluginConfig(options);
  const client = createS3Client(config);
  return { client, config };
};

const buildDerivedFormats = (file: ProviderUploadFile, sourceUrl: string, options: ReturnType<typeof resolvePluginConfig>) => {
  if (!isImageMimeType(file.mime)) {
    return undefined;
  }

  return Object.fromEntries(
    options.formats.map((format) => {
      const ext = format === 'jpeg' ? '.jpg' : `.${format}`;
      const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;

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
          url: buildResizedUrl(options, sourceUrl, format),
        },
      ];
    })
  );
};

const resolveBody = (file: ProviderUploadFile): Buffer | Readable => {
  if (file.buffer) {
    return file.buffer;
  }

  if (file.stream) {
    return file.stream;
  }

  throw new Error(`[${PLUGIN_ID}] File is missing both "buffer" and "stream".`);
};

const resolveObjectKey = (file: ProviderUploadFile, basePath: string) => {
  const ext = file.ext ?? '';
  return buildObjectKey(basePath, file.path, `${file.hash}${ext}`);
};

const provider = {
  init(providerOptions: RawPluginConfig = {}) {
    const { client, config } = initProvider(providerOptions);

    const upload = async (file: ProviderUploadFile) => {
      const objectKey = resolveObjectKey(file, config.basePath);
      const body = resolveBody(file);

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: objectKey,
          Body: body,
          ContentType: file.mime,
          CacheControl: config.cacheControl,
        })
      );

      const sourceUrl = buildPublicObjectUrl(config.publicBaseUrl, objectKey);

      file.url = sourceUrl;
      file.provider = PROVIDER_PACKAGE_NAME;
      file.provider_metadata = {
        bucket: config.bucket,
        key: objectKey,
      };
      file.formats = buildDerivedFormats(file, sourceUrl, config);
    };

    return {
      async upload(file: ProviderUploadFile) {
        await upload(file);
      },
      async uploadStream(file: ProviderUploadFile) {
        await upload(file);
      },
      async delete(file: ProviderUploadFile) {
        if (!file.provider_metadata && isCloudflareTransformUrl(file.url)) {
          return;
        }

        const metadataKey =
          typeof file.provider_metadata?.key === 'string' ? normalizeObjectKey(file.provider_metadata.key) : null;
        const keyFromUrl = extractObjectKeyFromPublicUrl(config.publicBaseUrl, file.url);
        const objectKey = metadataKey ?? keyFromUrl;

        if (!objectKey) {
          return;
        }

        try {
          await client.send(
            new DeleteObjectCommand({
              Bucket: config.bucket,
              Key: objectKey,
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
      async getSignedUrl(file: ProviderUploadFile) {
        return file;
      },
      async healthCheck() {
        await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
      },
    };
  },
};

// Named export for CJS consumers: require('...').init
export const { init } = provider;

// Default export for ESM consumers: import provider from '...'
export default provider;

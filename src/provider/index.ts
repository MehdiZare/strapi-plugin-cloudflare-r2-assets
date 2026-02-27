import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { PLUGIN_ID, PROVIDER_PACKAGE_NAME } from '../shared/constants';
import { resolvePluginConfig } from '../shared/config';
import { buildObjectKey, extractObjectKeyFromPublicUrl } from '../shared/path';
import type { ProviderUploadFile, RawPluginConfig } from '../shared/types';
import { buildPublicObjectUrl, buildResizedUrl } from '../shared/url-builder';

const isImageMimeType = (mime: string): boolean => mime.toLowerCase().startsWith('image/');

const createS3Client = (options: RawPluginConfig = {}) => {
  const config = resolvePluginConfig(options);

  const client = new S3Client({
    endpoint: config.endpoint,
    region: 'auto',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

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

const resolveBody = (file: ProviderUploadFile): Buffer | NodeJS.ReadableStream => {
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

export default {
  init(providerOptions: RawPluginConfig = {}) {
    const { client, config } = createS3Client(providerOptions);

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
        const metadataKey = typeof file.provider_metadata?.key === 'string' ? file.provider_metadata.key : undefined;
        const keyFromUrl = extractObjectKeyFromPublicUrl(config.publicBaseUrl, file.url);
        const objectKey = metadataKey ?? keyFromUrl;

        if (!objectKey) {
          return;
        }

        await client.send(
          new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: objectKey,
          })
        );
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


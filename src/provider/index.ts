import { Readable } from 'node:stream';

import { DEFAULT_MAX_UPLOAD_BUFFER_BYTES, PLUGIN_ID, PROVIDER_PACKAGE_NAME } from '../shared/constants';
import { resolvePluginConfig } from '../shared/config';
import { buildObjectKey, extractObjectKeyFromPublicUrl, normalizeObjectKey } from '../shared/path';
import { createR2Client, buildObjectUrl, buildBucketUrl } from '../shared/r2-client';
import type { ProviderUploadFile, RawPluginConfig } from '../shared/types';
import { buildPublicObjectUrl } from '../shared/url-builder';

const initProvider = (options: RawPluginConfig = {}) => {
  const config = resolvePluginConfig(options);
  const client = createR2Client(config);
  return { client, config };
};

const resolveBody = (file: ProviderUploadFile): Buffer | ReadableStream => {
  if (file.buffer) {
    return file.buffer;
  }

  if (file.stream) {
    return Readable.toWeb(file.stream) as ReadableStream;
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

      const url = buildObjectUrl(client.endpoint, config.bucket, objectKey);
      const headers: Record<string, string> = { 'Content-Type': file.mime };
      if (config.cacheControl) headers['Cache-Control'] = config.cacheControl;

      let response: Response;
      try {
        response = await client.fetch(url, {
          method: 'PUT',
          headers,
          body,
          duplex: 'half',
        } as RequestInit);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`[${PLUGIN_ID}] Failed to upload object "${objectKey}" to bucket "${config.bucket}": ${detail}`, { cause: error });
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`[${PLUGIN_ID}] Failed to upload object "${objectKey}" to bucket "${config.bucket}": HTTP ${response.status}${text ? `: ${text}` : ''}`);
      }

      file.url = buildPublicObjectUrl(config.publicBaseUrl, objectKey);
      file.provider = PROVIDER_PACKAGE_NAME;
      file.provider_metadata = {
        bucket: config.bucket,
        key: objectKey,
      };
    };

    return {
      async upload(file: ProviderUploadFile) {
        await upload(file);
      },
      async uploadStream(file: ProviderUploadFile) {
        // R2 requires Content-Length on PUT. Streams don't provide it,
        // so buffer the stream before uploading.
        if (file.stream && !file.buffer) {
          const maxBufferBytes = config.maxUploadBufferBytes ?? DEFAULT_MAX_UPLOAD_BUFFER_BYTES;
          const chunks: Buffer[] = [];
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
          file.stream = undefined;
        }
        await upload(file);
      },
      async delete(file: ProviderUploadFile) {
        const metadataKey =
          typeof file.provider_metadata?.key === 'string' ? normalizeObjectKey(file.provider_metadata.key) : null;
        const keyFromUrl = extractObjectKeyFromPublicUrl(config.publicBaseUrl, file.url);
        const objectKey = metadataKey ?? keyFromUrl;

        if (!objectKey) {
          return;
        }

        const url = buildObjectUrl(client.endpoint, config.bucket, objectKey);
        let response: Response;
        try {
          response = await client.fetch(url, { method: 'DELETE' });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          console.warn(`[${PLUGIN_ID}] Failed to delete object "${objectKey}" from bucket "${config.bucket}": ${detail}`);
          return;
        }

        if (!response.ok && response.status !== 404) {
          const text = await response.text().catch(() => '');
          console.warn(`[${PLUGIN_ID}] Failed to delete object "${objectKey}" from bucket "${config.bucket}": HTTP ${response.status}${text ? `: ${text}` : ''}`);
        }
      },
      isPrivate() {
        return false;
      },
      async getSignedUrl(file: ProviderUploadFile) {
        return file;
      },
      async healthCheck() {
        const url = buildBucketUrl(client.endpoint, config.bucket);
        let response: Response;
        try {
          response = await client.fetch(url, { method: 'HEAD' });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          throw new Error(`[${PLUGIN_ID}] Health check failed for bucket "${config.bucket}": ${detail}`, { cause: error });
        }

        if (!response.ok) {
          throw new Error(`[${PLUGIN_ID}] Health check failed for bucket "${config.bucket}": HTTP ${response.status}`);
        }
      },
    };
  },
};

// Named export for CJS consumers: require('...').init
export const { init } = provider;

// Default export for ESM consumers: import provider from '...'
export default provider;

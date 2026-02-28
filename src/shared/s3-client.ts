import { S3Client } from '@aws-sdk/client-s3';

import type { ResolvedPluginConfig } from './types';

export const createS3Client = (config: ResolvedPluginConfig): S3Client =>
  new S3Client({
    endpoint: config.endpoint,
    region: 'auto',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

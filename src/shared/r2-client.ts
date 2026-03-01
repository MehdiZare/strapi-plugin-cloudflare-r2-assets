import { AwsClient } from 'aws4fetch';

import type { ResolvedPluginConfig } from './types';

export interface R2Client {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  endpoint: string;
  bucket: string;
}

export const createR2Client = (config: ResolvedPluginConfig): R2Client => {
  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
  const endpoint = config.endpoint.replace(/\/+$/, '');
  return {
    fetch: (url, init) => aws.fetch(url, init),
    endpoint,
    bucket: config.bucket,
  };
};

export const buildObjectUrl = (endpoint: string, bucket: string, key: string): string =>
  `${endpoint}/${bucket}/${key}`;

export const buildBucketUrl = (endpoint: string, bucket: string): string =>
  `${endpoint}/${bucket}`;

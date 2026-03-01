import { Readable } from 'node:stream';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const r2FetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

vi.mock('../src/shared/r2-client', () => ({
  createR2Client: () => ({
    fetch: r2FetchMock,
    endpoint: 'https://acc_12345.r2.cloudflarestorage.com',
    bucket: 'media',
  }),
  buildObjectUrl: (ep: string, b: string, k: string) => `${ep}/${b}/${k}`,
  buildBucketUrl: (ep: string, b: string) => `${ep}/${b}`,
}));

import provider from '../src/provider/index';
import type { ProviderUploadFile, RawPluginConfig } from '../src/shared/types';

const baseOptions: RawPluginConfig = {
  accountId: 'acc_12345',
  bucket: 'media',
  accessKeyId: 'key_id',
  secretAccessKey: 'secret_key',
  publicBaseUrl: 'https://media.example.com',
};

const createFile = (overrides: Partial<ProviderUploadFile> = {}): ProviderUploadFile => {
  return {
    name: 'a.jpg',
    hash: 'abc123',
    ext: '.jpg',
    mime: 'image/jpeg',
    size: 10,
    url: '',
    ...overrides,
  };
};

describe('provider upload', () => {
  beforeEach(() => {
    r2FetchMock.mockReset();
    r2FetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it('uploads using stream when buffer is absent', async () => {
    const instance = provider.init(baseOptions);
    const stream = Readable.from(Buffer.from('stream-data'));

    const file = createFile({ buffer: undefined, stream });
    await instance.uploadStream(file);

    expect(r2FetchMock).toHaveBeenCalledTimes(1);
    const [, init] = r2FetchMock.mock.calls[0]!;
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBeDefined();
  });

  it('throws when stream exceeds max buffer size', async () => {
    const smallBufferLimit = 100; // 100 bytes
    const instance = provider.init({ ...baseOptions, maxUploadBufferBytes: smallBufferLimit });

    // Create a stream with data larger than the limit
    const largeData = Buffer.alloc(smallBufferLimit + 1, 'x');
    const stream = Readable.from(largeData);

    const file = createFile({ buffer: undefined, stream, name: 'large.jpg' });

    const error = await instance.uploadStream(file).catch((e: unknown) => e) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Failed to buffer upload stream for "large.jpg"');
    expect(error.message).toContain('exceeds maximum buffer size');
    expect(error.message).toContain(`${smallBufferLimit} bytes`);
  });

  it('throws when file has neither buffer nor stream', async () => {
    const instance = provider.init(baseOptions);
    const file = createFile({ buffer: undefined, stream: undefined });

    await expect(instance.upload(file)).rejects.toThrow('missing both "buffer" and "stream"');
  });

  it('throws with descriptive message when HTTP upload fails', async () => {
    r2FetchMock.mockResolvedValueOnce(new Response('AccessDenied', { status: 403 }));
    const instance = provider.init(baseOptions);
    const file = createFile({ buffer: Buffer.from('data') });

    const error = await instance.upload(file).catch((e: unknown) => e) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Failed to upload object "uploads/abc123.jpg" to bucket "media"');
    expect(error.message).toContain('403');
  });

  it('preserves cause when upload network request fails', async () => {
    const networkError = new Error('ECONNREFUSED');
    r2FetchMock.mockRejectedValueOnce(networkError);
    const instance = provider.init(baseOptions);
    const file = createFile({ buffer: Buffer.from('data') });

    const error = await instance.upload(file).catch((e: unknown) => e) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Failed to upload object "uploads/abc123.jpg" to bucket "media"');
    expect(error.message).toContain('ECONNREFUSED');
    expect(error.cause).toBe(networkError);
  });

  it('passes CacheControl header to PUT request', async () => {
    const instance = provider.init({ ...baseOptions, cacheControl: 'public, max-age=31536000' });
    const file = createFile({ buffer: Buffer.from('data') });

    await instance.upload(file);

    expect(r2FetchMock).toHaveBeenCalledTimes(1);
    const [, init] = r2FetchMock.mock.calls[0]!;
    const headers = init?.headers as Record<string, string>;
    expect(headers['Cache-Control']).toBe('public, max-age=31536000');
  });

  it('sets file.url, provider_metadata, and formats after upload', async () => {
    const instance = provider.init(baseOptions);
    const file = createFile({
      buffer: Buffer.from('data'),
      width: 800,
      height: 600,
    });

    await instance.upload(file);

    expect(file.url).toBe('https://media.example.com/uploads/abc123.jpg');
    expect(file.provider).toBe('strapi-plugin-cloudflare-r2-assets');
    expect(file.provider_metadata).toEqual({
      bucket: 'media',
      key: 'uploads/abc123.jpg',
    });
    expect(file.formats).toBeDefined();
    expect(file.formats).toHaveProperty('webp');
    expect(file.formats).toHaveProperty('avif');
  });

  it('does not set formats for non-image files', async () => {
    const instance = provider.init(baseOptions);
    const file = createFile({
      buffer: Buffer.from('data'),
      mime: 'application/pdf',
      ext: '.pdf',
      hash: 'doc123',
    });

    await instance.upload(file);

    expect(file.url).toBe('https://media.example.com/uploads/doc123.pdf');
    expect(file.formats).toBeUndefined();
  });
});

describe('provider delete', () => {
  beforeEach(() => {
    r2FetchMock.mockReset();
    r2FetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it('deletes using sanitized provider metadata key', async () => {
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        provider_metadata: { key: '/uploads///a.jpg' },
      })
    );

    expect(r2FetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = r2FetchMock.mock.calls[0]!;
    expect(init?.method).toBe('DELETE');
    expect(url).toContain('/media/uploads/a.jpg');
  });

  it('falls back to extracting key from trusted public URL', async () => {
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        url: 'https://media.example.com/uploads/from-url.jpg?token=abc',
      })
    );

    expect(r2FetchMock).toHaveBeenCalledTimes(1);
    const [url] = r2FetchMock.mock.calls[0]!;
    expect(url).toContain('/media/uploads/from-url.jpg');
  });

  it('skips delete when URL does not match the configured origin', async () => {
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        url: 'https://media.example.com.attacker.example/uploads/a.jpg',
      })
    );

    expect(r2FetchMock).not.toHaveBeenCalled();
  });

  it('skips delete for format variant URLs (cdn-cgi transform, no provider_metadata)', async () => {
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        url: 'https://media.example.com/cdn-cgi/image/format=webp,quality=82/uploads/abc123.jpg',
        provider_metadata: undefined,
      })
    );

    expect(r2FetchMock).not.toHaveBeenCalled();
  });

  it('still deletes when provider_metadata exists even if URL looks like a transform URL', async () => {
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        url: 'https://media.example.com/cdn-cgi/image/format=webp,quality=82/uploads/abc123.jpg',
        provider_metadata: { key: 'uploads/abc123.jpg' },
      })
    );

    expect(r2FetchMock).toHaveBeenCalledTimes(1);
    const [url] = r2FetchMock.mock.calls[0]!;
    expect(url).toContain('/media/uploads/abc123.jpg');
  });

  it('logs warning and does not throw when delete fails', async () => {
    r2FetchMock.mockRejectedValueOnce(new Error('AccessDenied'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const instance = provider.init(baseOptions);

    await expect(
      instance.delete(
        createFile({
          url: 'https://media.example.com/uploads/abc123.jpg',
        })
      )
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('does not warn when DELETE returns 404', async () => {
    r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({ url: 'https://media.example.com/uploads/abc123.jpg' })
    );

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns with HTTP status when DELETE returns 500', async () => {
    r2FetchMock.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({ url: 'https://media.example.com/uploads/abc123.jpg' })
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'));
    warnSpy.mockRestore();
  });

  it('warning includes the object key and error message', async () => {
    r2FetchMock.mockRejectedValueOnce(new Error('NoSuchBucket'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const instance = provider.init(baseOptions);

    await instance.delete(
      createFile({
        url: 'https://media.example.com/uploads/abc123.jpg',
      })
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('uploads/abc123.jpg')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('NoSuchBucket')
    );
    warnSpy.mockRestore();
  });
});

describe('provider healthCheck', () => {
  beforeEach(() => {
    r2FetchMock.mockReset();
    r2FetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it('resolves when HEAD bucket succeeds', async () => {
    const instance = provider.init(baseOptions);
    await expect(instance.healthCheck()).resolves.toBeUndefined();
    expect(r2FetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws with descriptive message when HEAD bucket returns non-ok', async () => {
    r2FetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    const instance = provider.init(baseOptions);

    const error = await instance.healthCheck().catch((e: unknown) => e) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Health check failed for bucket "media"');
    expect(error.message).toContain('404');
  });

  it('preserves cause when HEAD bucket network request fails', async () => {
    const networkError = new Error('ECONNREFUSED');
    r2FetchMock.mockRejectedValueOnce(networkError);
    const instance = provider.init(baseOptions);

    const error = await instance.healthCheck().catch((e: unknown) => e) as Error;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Health check failed for bucket "media"');
    expect(error.message).toContain('ECONNREFUSED');
    expect(error.cause).toBe(networkError);
  });
});
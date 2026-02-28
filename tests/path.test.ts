import { describe, expect, it } from 'vitest';

import { buildObjectKey, extractObjectKeyFromPublicUrl, isCloudflareTransformUrl } from '../src/shared/path';

describe('path helpers', () => {
  it('builds safe object key', () => {
    const key = buildObjectKey('/uploads/', '../foo/bar', 'abc.png');
    expect(key).toBe('uploads/foo/bar/abc.png');
  });

  it('extracts key from public URL', () => {
    const key = extractObjectKeyFromPublicUrl('https://media.example.com', 'https://media.example.com/uploads/a.jpg');
    expect(key).toBe('uploads/a.jpg');
  });

  it('returns null for unrelated URL', () => {
    const key = extractObjectKeyFromPublicUrl('https://media.example.com', 'https://cdn.other.com/a.jpg');
    expect(key).toBeNull();
  });

  it('returns null for host-prefix spoofed URL', () => {
    const key = extractObjectKeyFromPublicUrl(
      'https://media.example.com',
      'https://media.example.com.attacker.example/uploads/a.jpg'
    );
    expect(key).toBeNull();
  });

  it('extracts key when public base URL includes a path', () => {
    const key = extractObjectKeyFromPublicUrl(
      'https://media.example.com/assets',
      'https://media.example.com/assets/uploads/a.jpg?token=1#anchor'
    );
    expect(key).toBe('uploads/a.jpg');
  });
});

describe('isCloudflareTransformUrl', () => {
  it('returns true for Cloudflare transform URL', () => {
    expect(
      isCloudflareTransformUrl('https://example.com/cdn-cgi/image/format=webp,quality=82/uploads/abc.jpg')
    ).toBe(true);
  });

  it('returns false for regular public URL', () => {
    expect(isCloudflareTransformUrl('https://media.example.com/uploads/abc.jpg')).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(isCloudflareTransformUrl(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isCloudflareTransformUrl('')).toBe(false);
  });

  it('returns false for invalid URL', () => {
    expect(isCloudflareTransformUrl('not-a-url')).toBe(false);
  });

  it('returns false when /cdn-cgi/image/ only appears in query string', () => {
    expect(
      isCloudflareTransformUrl('https://example.com/uploads/abc.jpg?ref=/cdn-cgi/image/foo')
    ).toBe(false);
  });
});

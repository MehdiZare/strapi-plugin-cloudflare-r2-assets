import { describe, expect, it } from 'vitest';

import { buildPublicObjectUrl, buildResizedUrl } from '../src/shared/url-builder';

describe('url builder', () => {
  it('builds public object URL', () => {
    const url = buildPublicObjectUrl('https://media.example.com/', 'uploads/a.jpg');
    expect(url).toBe('https://media.example.com/uploads/a.jpg');
  });

  it('builds resize URL for local source path', () => {
    const url = buildResizedUrl(
      {
        publicBaseUrl: 'https://media.example.com',
        quality: 82,
      },
      'https://media.example.com/uploads/a.jpg',
      'webp'
    );

    expect(url).toBe('https://media.example.com/cdn-cgi/image/format=webp,quality=82/uploads/a.jpg');
  });
});

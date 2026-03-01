import { describe, expect, it } from 'vitest';

import { buildPublicObjectUrl } from '../src/shared/url-builder';

describe('url builder', () => {
  it('builds public object URL', () => {
    const url = buildPublicObjectUrl('https://media.example.com/', 'uploads/a.jpg');
    expect(url).toBe('https://media.example.com/uploads/a.jpg');
  });
});

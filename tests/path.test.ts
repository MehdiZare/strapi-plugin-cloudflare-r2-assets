import { describe, expect, it } from 'vitest';

import { buildObjectKey, extractObjectKeyFromPublicUrl } from '../src/shared/path';

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
});


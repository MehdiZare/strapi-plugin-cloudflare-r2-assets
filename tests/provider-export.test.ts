import { describe, it, expect } from 'vitest';

describe('provider exports', () => {
  it('exposes init as a named export', async () => {
    const mod = await import('../src/provider/index');
    expect(typeof mod.init).toBe('function');
  });

  it('exposes init on the default export', async () => {
    const mod = await import('../src/provider/index');
    expect(typeof mod.default.init).toBe('function');
  });
});

import { describe, expect, it } from 'vitest';

import { SETTINGS_READ_ACTION } from '../src/shared/constants';
import adminRoutes from '../server/src/routes/admin';

describe('admin routes', () => {
  it('enforces explicit read permissions for settings status', () => {
    const route = adminRoutes.routes[0];

    expect(route?.path).toBe('/settings/status');
    expect(route?.config?.policies).toEqual([
      {
        name: 'admin::hasPermissions',
        config: {
          actions: [SETTINGS_READ_ACTION],
        },
      },
    ]);
  });
});

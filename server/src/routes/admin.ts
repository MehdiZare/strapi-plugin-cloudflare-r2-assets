import { SETTINGS_READ_ACTION } from '../../../src/shared/constants';

export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings/status',
      handler: 'settings.status',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [SETTINGS_READ_ACTION],
            },
          },
        ],
      },
    },
  ],
};

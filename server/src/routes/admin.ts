export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings/status',
      handler: 'settings.status',
      config: {
        policies: [],
      },
    },
  ],
};


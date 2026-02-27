import type { StrapiApp } from '@strapi/strapi/admin';
import { prefixPluginTranslations } from '@strapi/strapi/admin';

import pluginId from './pluginId';
import getTrad from './utils/getTrad';

export default {
  register(app: StrapiApp) {
    app.registerPlugin({
      id: pluginId,
      name: 'Cloudflare R2 Assets',
    });
  },

  bootstrap(app: StrapiApp) {
    app.addSettingsLink('global', {
      id: `${pluginId}-settings`,
      to: `/settings/${pluginId}`,
      intlLabel: {
        id: getTrad('settings.link.label'),
        defaultMessage: 'Cloudflare R2 Assets',
      },
      Component: () => import('./pages/SettingsStatusPage'),
      permissions: [],
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale: string) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return {
            data: prefixPluginTranslations(data, pluginId),
            locale,
          };
        } catch {
          return {
            data: {},
            locale,
          };
        }
      })
    );
  },
};

import type { StrapiApp } from '@strapi/strapi/admin';

import { SETTINGS_READ_ACTION } from '../../src/shared/constants';
import pluginId from './pluginId';
import getTrad from './utils/getTrad';

type TranslationDictionary = Record<string, string>;

const prefixTranslations = (data: TranslationDictionary, prefix: string): TranslationDictionary =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [`${prefix}.${key}`, value]));

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
      permissions: [
        {
          action: SETTINGS_READ_ACTION,
          subject: null,
        },
      ],
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale: string) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return {
            data: prefixTranslations(data as TranslationDictionary, pluginId),
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

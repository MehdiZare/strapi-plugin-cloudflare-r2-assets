import type { SettingsStatusResponse } from '../../../src/shared/types';
import { PLUGIN_ID } from '../../../src/shared/constants';

type StrapiLike = {
  plugin: (id: string) => {
    service: (name: string) => {
      getStatus: () => Promise<SettingsStatusResponse>;
    };
  };
};

type Ctx = { body?: unknown };

export default ({ strapi }: { strapi: StrapiLike }) => ({
  async status(ctx: Ctx) {
    ctx.body = await strapi.plugin(PLUGIN_ID).service('status').getStatus();
  },
});

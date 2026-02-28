import { PLUGIN_ID } from '../../src/shared/constants';
import controllers from './controllers';
import routes from './routes';
import services from './services';

type StrapiLike = {
  admin?: {
    services?: {
      permission?: {
        actionProvider?: {
          registerMany?: (
            actions: Array<{
              section: string;
              displayName: string;
              uid: string;
              pluginName: string;
            }>
          ) => void;
        };
      };
    };
  };
};

export default () => {
  return {
    register({ strapi }: { strapi?: StrapiLike } = {}) {
      strapi?.admin?.services?.permission?.actionProvider?.registerMany?.([
        {
          section: 'plugins',
          displayName: 'Read',
          uid: 'read',
          pluginName: PLUGIN_ID,
        },
      ]);
    },
    bootstrap() {},
    controllers,
    routes,
    services,
  };
};

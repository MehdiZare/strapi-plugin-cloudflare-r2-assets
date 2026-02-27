import controllers from './controllers';
import routes from './routes';
import services from './services';

export default () => {
  return {
    register() {},
    bootstrap() {},
    controllers,
    routes,
    services,
  };
};


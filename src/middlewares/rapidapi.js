'use strict';

const _ = require('lodash');

/**
 * `rapidapi` middleware.
 */

module.exports = (config, { strapi }) => {

  const proxySecret = strapi.config.get('server.rapidapi.proxySecret');
  // Add your own logic here.
  return async (ctx, next) => {
    strapi.log.info('In rapidapi middleware.');

    const headers = {
      proxySecret: _.get(ctx.request.headers, 'x-rapidapi-proxy-secret'),
      user: _.get(ctx.request.headers, 'x-rapidapi-user'),
      subscription: _.get(ctx.request.headers, 'x-rapidapi-subscription'),
      version: _.get(ctx.request.headers, 'x-rapidapi-version'),
      forwardedFor: _.get(ctx.request.headers, 'x-rapidapi-for'),
      useTestnet: _.get(ctx.request.headers, 'y-network') !== 'mainnet' ? true : false
    };

    if (headers.proxySecret && proxySecret === headers.proxySecret) {
      ctx.state.rapidApi = headers;
      await next();
    }
  };
};

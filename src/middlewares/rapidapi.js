'use strict';

const _ = require('lodash');

/**
 * `rapidapi` middleware.
 */

module.exports = (config, { strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    strapi.log.info('In rapidapi middleware.');
    // get headers from koa ctx
    // const headers = _.pick(ctx.request.headers, [
    //   'X-RapidAPI-Proxy-Secret',
    //   'X-RapidAPI-User',
    //   'X-RapidAPI-Subscription',
    //   'X-RapidAPI-Version',
    //   'X-Forwarded-For'
    // ]);
    const headers = {
      proxySecret: _.get(ctx.request.headers, 'X-RapidAPI-Proxy-Secret'),
      user: _.get(ctx.request.headers, 'X-RapidAPI-User'),
      subscription: _.get(ctx.request.headers, 'X-RapidAPI-Subscription'),
      version: _.get(ctx.request.headers, 'X-RapidAPI-Version'),
      forwardedFor: _.get(ctx.request.headers, 'X-RapidAPI-For'),
    };

    if (strapi.config.get('server.rapidapi.proxySecret') === headers.proxySecret) {
      ctx.state.rapidApi = headers;
      ctx.state.rapidApi.user = _.get(headers, 'X-RapidAPI-User');
      await next();
    }
  };
};

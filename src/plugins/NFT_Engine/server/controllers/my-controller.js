'use strict';

module.exports = {
  index(ctx) {
    ctx.body = strapi
      .plugin('NFT_Engine')
      .service('myService')
      .getWelcomeMessage();
  },
};

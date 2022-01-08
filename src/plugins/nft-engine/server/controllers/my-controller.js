'use strict';

module.exports = {
  index(ctx) {
    // ctx.body = strapi
    //   .plugin('nft-engine')
    //   .service('myService')
    //   .getWelcomeMessage();
    ctx.body = strapi
      .plugin('nft-engine')
      .init.foo;
  },
};

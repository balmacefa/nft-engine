'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/createNFT',
      handler: 'engineController.createJob',
      config: {
        middlewares: ['global::rapidapi'],
      },
    },
  ],
};

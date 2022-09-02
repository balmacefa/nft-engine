'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/createNFT',
      handler: 'engineController.createJob',
      config: {
        // auth: false, this is handled by middleware global::rapidApi
        auth: false,
        middlewares: ['global::rapidapi'],
      },
    },
    {
      method: 'POST',
      path: '/contract_claims/:network/:blockchain',
      handler: 'ContractClaimsController.addContractClaim',
      config: {
        /// auth: false, this is handled by middleware global::rapidApi
        auth: false,
        middlewares: ['global::rapidapi'],
      }
    },
    {
      method: 'GET',
      path: '/NFT_orders/:id',
      handler: 'NFT_ordersController.findOne',
      config: {
        /// auth: false, this is handled by middleware global::rapidApi
        auth: false,
        middlewares: ['global::rapidapi'],
      },
    },
    {
      method: 'GET',
      path: '/NFT_orders',
      handler: 'NFT_ordersController.getListByUser',
      config: {
        /// auth: false, this is handled by middleware global::rapidApi
        auth: false,
        middlewares: ['global::rapidapi'],
      },
    },
    {
      method: 'GET',
      path: '/NFT_contracts/:id',
      handler: 'NFT_contractsController.findOne',
      config: {
        /// auth: false, this is handled by middleware global::rapidApi
        auth: false,
        middlewares: ['global::rapidapi'],
      },
    },
    {
      method: 'GET',
      path: '/NFT_contracts',
      handler: 'NFT_contractsController.getListByUser',
      config: {
        /// auth: false, this is handled by middleware global::rapidApi
        auth: false,
        middlewares: ['global::rapidapi'],
      },
    },
  ],
};

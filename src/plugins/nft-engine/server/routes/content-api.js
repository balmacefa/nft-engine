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
    {
      method: 'POST',
      path: '/contract_claims/{network}/{blockchain}',
      handler: 'ContractClaimsController.addContractClaim',
      config: {
        middlewares: ['global::rapidapi'],
      }
    },
    {
      method: 'GET',
      path: '/NFT_orders/{id}',
      handler: 'NFT_ordersController.findOne',
      config: {
        middlewares: ['global::rapidapi'],
      },
    },
    {
      method: 'GET',
      path: '/NFT_orders',
      handler: 'NFT_ordersController.getListByUser',
      config: {
        middlewares: ['global::rapidapi'],
      },
    },
    {
      method: 'GET',
      path: '/NFT_contracts/{id}',
      handler: 'NFT_contractsController.findOne',
      config: {
        middlewares: ['global::rapidapi'],
      },
    },
    {
      method: 'GET',
      path: '/NFT_contracts',
      handler: 'NFT_contractsController.getListByUser',
      config: {
        middlewares: ['global::rapidapi'],
      },
    },
  ],
};

'use strict';

/**
 * nft-mint-order service.
 */

const { createCoreService } = require('@strapi/strapi').factories;


const apiId = 'api::nft-mint-order.nft-mint-order';
// How to use  this service
// const nftContractService = strapi.service('api::package-order.package-order')
module.exports = createCoreService(apiId, ({ strapi, env }) => ({
  // blockchain}____${collectionName}____${symbol}____${tokenId
  getJobId: ({ userId, blockchain, collectionName, symbol, tokenId }) => {
    return `${userId}:${blockchain}:${collectionName}____${symbol}:${tokenId}`;
  }
}));

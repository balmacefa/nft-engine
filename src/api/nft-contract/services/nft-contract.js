'use strict';

/**
 * nft-contract service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

const apiId = 'api::nft-contract.nft-contract';
// How to use  this service
// const nftContractService = strapi.service('api::package-order.package-order')
module.exports = createCoreService(apiId, ({ strapi, env }) => ({
  findContractEntity: async ({
    user,
    blockchain,
    collectionName,
    symbol,
    useTestNet
  }) => {
    const nftContractDB = strapi.db.query(apiId);

    let contractEntity = await nftContractDB.findOne({
      where: {
        user,
        blockchain,
        collectionName,
        symbol,
        useTestNet
      }
    });
    return contractEntity;
  },
  updateContractEntity: async (id, data) => {
    const nftContractDB = strapi.db.query(apiId);
    const contractEntity = await nftContractDB.update(
      {
        where: {
          id
        },
        data
      });
    return contractEntity;
  }

}));

'use strict';

/**
 * nft-contract service.
 */
const { createCoreService } = require('@strapi/strapi').factories;
const seedrandom = require('seedrandom');

const getHashedCollectionName = (collectionName, userId) => {
  // replace - with _
  const hash = seedrandom(userId).int32().toString().replace(/-/g, '_');

  // if the collectionName ends with hash, return it
  if (collectionName.endsWith(hash)) {
    return collectionName;
  }

  return `${collectionName}-${hash}`;
};

const apiId = 'api::nft-contract.nft-contract';
// How to use  this service
// const nftContractService = strapi.service('api::package-order.package-order')
module.exports = createCoreService(apiId, ({ strapi, env }) => ({
  getHashedCollectionName: getHashedCollectionName,
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

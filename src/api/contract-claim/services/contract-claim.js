'use strict';

/**
 * contract-claim service.
 */
const _ = require('lodash');

const { createCoreService } = require('@strapi/strapi').factories;

const apiId = 'api::contract-claim.contract-claim';

const findContractClaims = async (strapi, user, blockchain, useTestNet) => {
  const nftContractClaimsDB = strapi.db.query(apiId);
  let contractClaimEntity = await nftContractClaimsDB.findOne({
    where: {
      user,
      blockchain,
      useTestNet
    }
  });
  return contractClaimEntity;
};

const userHaveContractClaims = async (strapi, user, blockchain, useTestNet) => {
  const contractClaimEntity = await findContractClaims(strapi, user, blockchain, useTestNet);
  if (!contractClaimEntity || _.get(contractClaimEntity, 'remainClaims', 0) <= 0) {
    return false;
  }
  return true;
};

const increaseContractClaim = async (strapi, user, blockchain, useTestNet) => {
  const contractClaimEntity = await findContractClaims(strapi, user, blockchain, useTestNet);
  if (!contractClaimEntity) {
    return strapi.db.query(apiId).create(
      {
        data: {
          user,
          blockchain,
          useTestNet,
          remainClaims: 1
        }
      });
  }
  const base = contractClaimEntity.remainClaims < 0 ? 0 : contractClaimEntity.remainClaims;
  return strapi.db.query(apiId).update({
    where: {
      id: contractClaimEntity.id
    },
    data: {
      remainClaims: base + 1
    }
  });
};

const decreaseContractClaim = async (strapi, user, blockchain, useTestNet) => {
  const contractClaimEntity = await findContractClaims(strapi, user, blockchain, useTestNet);
  if (!contractClaimEntity) {
    // throw error
    throw new Error(`No contract claim found for user: ${user} - blockchain: ${blockchain} - useTestNet: ${useTestNet}`);
  }
  return strapi.db.query(apiId).update({
    where: {
      id: contractClaimEntity.id
    },
    data: {
      remainClaims: contractClaimEntity.remainClaims - 1
    }
  });
};

module.exports = createCoreService(apiId, ({ strapi }) => ({
  findContractClaims: async (userId, blockchain, useTestNet) => findContractClaims(strapi, userId, blockchain, useTestNet),
  userHaveContractClaims: async (userId, blockchain, useTestNet) => userHaveContractClaims(strapi, userId, blockchain, useTestNet),
  increaseContractClaim: async (userId, blockchain, useTestNet) => increaseContractClaim(strapi, userId, blockchain, useTestNet),
  decreaseContractClaim: async (userId, blockchain, useTestNet) => decreaseContractClaim(strapi, userId, blockchain, useTestNet)
}));

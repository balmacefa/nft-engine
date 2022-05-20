'use strict';

/**
 *  NFT_OrdersController
 */

// get lodash
const _ = require('lodash');

module.exports = ({ strapi }) => ({
  addContractClaim: async ctx => {
    strapi.log.info('ENTER POST /contract_claims/{network}/{blockchain}');
    strapi.log.debug(JSON.stringify(ctx?.request?.body));

    const contractClaimService = strapi.service('api::contract-claim.contract-claim');

    const userId = ctx.state.rapidApi.user;

    let {
      network,
    } = ctx.request.params;

    let {
      blockchain,
    } = ctx.request.body;

    const use_test_net = network !== 'mainnet' ? true : false;

    let entity;
    try {
      entity = await contractClaimService.increaseContractClaim(userId, blockchain, use_test_net);
    } catch (error) {
      return ctx.badRequest(`Error while parsing request body \n ${error.message}`);
    }


    strapi.log.info(`EXIT POST /contract_claims/{network}/{blockchain} \n ${JSON.stringify(entity)}`);
    return entity;
  },
});

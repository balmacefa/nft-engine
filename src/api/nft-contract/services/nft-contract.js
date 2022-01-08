'use strict';

/**
 * nft-contract service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::nft-contract.nft-contract');

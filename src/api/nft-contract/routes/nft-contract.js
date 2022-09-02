'use strict';

/**
 * nft-contract router.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::nft-contract.nft-contract');

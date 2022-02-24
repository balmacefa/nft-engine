'use strict';

/**
 * package-order router.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::package-order.package-order');

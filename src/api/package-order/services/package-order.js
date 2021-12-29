'use strict';

/**
 * package-order service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::package-order.package-order');

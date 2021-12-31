'use strict';

/**
 * package-order service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

let stripe = undefined;

module.exports = createCoreService('api::package-order.package-order', ({ strapi, env }) => ({
    stripe: () => {
        if (!stripe) {
            stripe = require('stripe')(strapi.config.get('server.stripe_api_key'));
        }
        return stripe;
    }
}));

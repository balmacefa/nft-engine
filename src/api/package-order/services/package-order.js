'use strict';

/**
 * package-order service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

let stripe = undefined;

module.exports = createCoreService('api::package-order.package-order', ({ strapi, env }) => ({
    stripe: () => {
        if (stripe) {
            stripe = require('stripe')(env('STRIPE_API_KEY'));
        }
        return stripe;
    }
}));

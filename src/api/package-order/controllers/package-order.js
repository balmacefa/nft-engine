'use strict';

/**
 *  package-order controller
 */
 const packagePriceUSD = 7.5;

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::package-order.package-order', ({ strapi }) => ({

    createCheckoutSession: async ctx => {
        const user = ctx.state.user;
        const {
            quantity
        } = ctx.request.body;

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: '5_TikTok_NFT_Package',
                        },
                        unit_amount_decimal: packagePriceUSD,
                    },
                    quantity: quantity,
                },
            ],
            allow_promotion_codes: true,
            client_reference_id: user.id,
            mode: 'payment',
            success_url: `${strapi.config.get('server.url')}/order-success`,
            cancel_url: `${strapi.config.get('server.url')}/order-cancel`,
        });

        ctx.response.redirect(session.url);
    },
    create: async ctx => {
        stripe = strapi.service('api::package-order.package-order').stripe();
        orderAPI = strapi.service('api::package-order.package-order')
        const user = ctx.state.user;
        const {
            quantity
        } = ctx.request.body;

        // Charge the customer
        try {
            await stripe.charges.create({
                // Transform cents to dollars.
                amount: amount * 100,
                currency: 'usd',
                description: `Order ${new Date()} by ${user.id}`,
                source: token,
            });

            // Register the order in the database
            try {
                const validData = await strapi.entityValidator.validateEntityUpdate(strapi.models.package_orders, data)

                const order = await orderAPI.create({
                    user: ctx.state.user.id,
                    address,
                    amount,
                    dishes,
                    postalCode,
                    city,
                });

                const sanitizedEntity = await this.sanitizeOutput(order, ctx);
                return this.transformResponse(sanitizedEntity);
            } catch (err) {
                // Silent
            }
        } catch (err) {
            // Silent
        }
    },
}));
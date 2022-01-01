'use strict';

/**
 *  package-order controller
 */
const packagePriceUSD = 7.5;

const { createCoreController } = require('@strapi/strapi').factories;
const unparsed = require('koa-body/unparsed.js');


module.exports = createCoreController('api::package-order.package-order', ({ strapi }) => ({

    createCheckoutSession: async ctx => {
        strapi.log.info('ENTER POST /package-order/checkout-session');
        strapi.log.debug(JSON.stringify(ctx?.request?.body));

        // log strapi
        const stripe = strapi.service('api::package-order.package-order').stripe();

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
                        unit_amount_decimal: packagePriceUSD * 100,
                    },
                    quantity: quantity,
                },
            ],
            allow_promotion_codes: true,
            // client_reference_id: user?.id,
            metadata: {
                strapi_user_id: "user.id",
            },
            mode: 'payment',
            success_url: strapi.config.get('server.stripe_success_url'),
            cancel_url: strapi.config.get('server.stripe_cancel_url'),
        });

        strapi.log.debug("Stripe session: \n" + JSON.stringify(session));
        strapi.log.info('EXIT POST /package-order/checkout-session');

        return session.url;
    },
    webhookFulfillOrder: async ctx => {
        strapi.log.info('ENTER POST /package-order/webhook/fulfill-order');

        const stripe = strapi.service('api::package-order.package-order').stripe();
        const orderAPI = strapi.service('api::package-order.package-order');

        const payload = ctx.request.body[unparsed];
        const sig = ctx?.request?.header['stripe-signature'];
        const secret = strapi.config.get('server.stripe_webhook_secret');

        let event;

        try {
            event = stripe.webhooks.constructEvent(payload, sig, secret);
        } catch (err) {
            strapi.log.error(`ERROR 400 Webhook: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.throw(400, `Webhook Error`);
        }
        // Handle the checkout.session.completed event
        if (event.type === 'checkout.session.completed') {
            try {
                const session = event.data.object;
                strapi.log.debug("Stripe session: \n" + JSON.stringify(session));
                const order = await stripe.checkout.sessions.listLineItems(session.id);
                strapi.log.debug("Stripe Order: \n" + JSON.stringify(order));
                const orderDetails = order.data[0];

                // Register the order in the database
                const entity = await orderAPI.create(
                    {
                        data: {
                            quantity: orderDetails.quantity,
                            totalTikToks: orderDetails.quantity * 5,
                            remainMints_mod: orderDetails.quantity * 5,
                            stripeResponseSessionObj: session,
                            stripeResponseListLineItemsObj: order,
                            amount_subtotal: session.amount_subtotal / 100,
                            amount_total: session.amount_total / 100,
                            // referralCode: TODO: get referral code from ?session?
                            user: session?.metadata?.strapi_user_id
                        }
                    }
                );
                strapi.log.info('EXIT POST /package-order/webhook/fulfill-order with: \n' + JSON.stringify(entity));
                return entity;
            } catch (err) {
                strapi.log.error(`ERROR: \n ${err.message}`);
                strapi.log.error(JSON.stringify(err));
                return ctx.throw(400, `Webhook Error`);
            }
        }
        // return ok
        return ctx.body = 'processed';
    },
}));
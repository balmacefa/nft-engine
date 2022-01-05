'use strict';

/**
 *  package-order controller
 */
const packagePriceUSD = 7.5;

const { createCoreController } = require('@strapi/strapi').factories;
const unparsed = require('koa-body/unparsed.js');


const countRemainMints_mod = async (strapi, userId) => {
    const referralAPI = strapi.db.query('api::package-order.package-order');
    const entries = await referralAPI.findMany({
        select: ['remainMints_mod', 'id'],
        where: {
            user: userId,
            remainMints_mod: {
                $gt: 0,
            },
        },
        populate: false,
    });
    // [{remainMints_mod:10}, {remainMints_mod:20}]
    const sum = entries.reduce((acc, cur) => acc + cur.remainMints_mod, 0);
    return sum;
}

module.exports = createCoreController('api::package-order.package-order', ({ strapi }) => ({

    createCheckoutSession: async ctx => {
        strapi.log.info('ENTER POST /package-order/checkout-session');
        strapi.log.debug(JSON.stringify(ctx?.request?.body));

        // log strapi
        const stripe = strapi.service('api::package-order.package-order').stripe();

        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id

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
            client_reference_id: userId,
            metadata: {
                strapi_user_id: userId,
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
            let session;
            let orderDetails;
            let order;
            let referral;

            try {
                session = event.data.object;
                strapi.log.debug("Stripe session: \n" + JSON.stringify(session));
                order = await stripe.checkout.sessions.listLineItems(session.id);

                if (session.amount_total !== session.amount_subtotal) {
                    // a coupon was applied to the session
                    session = await stripe.checkout.sessions.retrieve(
                        session.id,
                        {
                            expand: ['total_details.breakdown'],
                        }
                    );
                    strapi.log.info("Stripe session has a promo coupon code applied: \n" + JSON.stringify(session));

                    const referralAPI = strapi.db.query('api::referral.referral');
                    // find referral with stripe_id
                    const promotionCode = session.total_details.breakdown.discounts[0].discount.promotion_code;
                    referral = await referralAPI.findOne({
                        where: {
                            stripe_id: promotionCode
                        }
                    });
                    strapi.log.info("Using referral: \n" + JSON.stringify(referral));
                }

                strapi.log.debug("Stripe Order: \n" + JSON.stringify(order));
                orderDetails = order.data[0];
            } catch (err) {
                strapi.log.error(`ERROR: \n ${err.message}`);
                strapi.log.error(JSON.stringify(err));
                return ctx.throw(400, `Webhook Error`);
            }

            try {
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
                            ...(referral) && { referral: referral.id },
                            user: session?.metadata?.strapi_user_id
                        }
                    }
                );
                strapi.log.info('EXIT POST /package-order/webhook/fulfill-order with: \n' + JSON.stringify(entity));
                return entity;
            } catch (err) {
                strapi.log.error(`ERROR: \n ${err.message}`);
                strapi.log.error(JSON.stringify(err));
                return ctx.throw(400, `Error while creating order`);
            }
        }
        // return ok
        return ctx.body = 'processed';
    },
    countRemainMints: async ctx => {
        strapi.log.info('ENTER GET /package-order/countRemainMints_mod');

        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id

        const count = await countRemainMints_mod(strapi, userId);
        strapi.log.info('EXIT GET /package-order/countRemainMints_mod');
        return count;
    }
}));
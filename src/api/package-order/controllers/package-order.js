'use strict';

/**
 *  package-order controller
 */
const packagePriceUSD = 7.5;

const { createCoreController } = require('@strapi/strapi').factories;
const unparsed = require('koa-body/unparsed.js');
const CacheKey = require('../../utils/CacheKeys.js');
const _ = require('lodash');

const countRemainMints_mod = async (strapi, userId) => {
    const Cache = strapi.plugin('nft-engine').redisCache;
    const key = CacheKey.countRemainMints(userId);
    return await Cache.wrap(key, async () => {
        strapi.log.debug(`HIT CACHING cb for key: ${key}`);
        const packageOrderDB = strapi.db.query('api::package-order.package-order');
        const entries = await packageOrderDB.findMany({
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
    });
}

const _getLastPackageOrderDB = async (strapi, userId, action) => {
    const packageOrderDB = strapi.db.query('api::package-order.package-order');
    // referralAPI.findMany in FIFO order
    // getNextReferralAPI if remainMints_mod > 0
    // sort by createdAt: 'DESC'
    // if remainMints_mod == 0 
    const query = {
        select: ['remainMints_mod', 'id'],
        where: {
            user: userId,
            remainMints_mod: {
            }
        },
        sort: [
            {
                createdAt: 'DESC',
            },
        ],
        populate: false,
    }
    // ((action === 'increase') 
    if (action === 'INCREASE') {
        query.where.remainMints_mod = {
            $gt: 0,
        }
    } else if (action === 'DECREASE') {
        query.where.remainMints_mod = {
            $lt: 0,
        }
    }
    const entries = await packageOrderDB.findOne(query);
    return _get(entries, "data[0].attributes", null);
}

// reduce remainMints_mod by 1 to the last packageOrderDB
const _reduceRemainMints_mod = async (strapi, userId) => {
    const entity = _getLastPackageOrderDB(strapi, userId, 'DECREASE');
    if (_.isNull(entity)) {
        // return th('You have no remaining balance to mint, please purchase more packages mints');
        throw new Error('FATAL_NO_RECOVERY: You have no remaining balance to mint, please purchase more packages mints');
    }
    const packageOrderDB = strapi.db.query('api::package-order.package-order');
    const { id, remainMints_mod } = entity;
    const newRemainMints_mod = remainMints_mod - 1;
    const update = {
        remainMints_mod: newRemainMints_mod,
    }

    return await packageOrderDB.update(
        {
            where: {
                id: id
            },
            data: update
        });
}

const _increaseRemainMints_mod = async (strapi, userId) => {
    const entity = _getLastPackageOrderDB(strapi, userId, 'INCREASE');
    if (_.isNull(entity)) {
        // return th('You have no remaining balance to mint, please purchase more packages mints');
        throw new Error('FATAL_NO_RECOVERY: You have no remaining balance to mint, please purchase more packages mints');
    }
    const packageOrderDB = strapi.db.query('api::package-order.package-order');
    const { id, remainMints_mod } = entity;
    const newRemainMints_mod = remainMints_mod + 1;
    const update = {
        remainMints_mod: newRemainMints_mod,
    }

    return await packageOrderDB.update(
        {
            where: {
                id: id
            },
            data: update
        });
}

module.exports = createCoreController('api::package-order.package-order', ({ strapi }) => ({

    getCountRemainMints: async (strapi, userId) => await countRemainMints_mod(strapi, userId),
    getLastPackageOrderDB: async (strapi, userId, action) => await _getLastPackageOrderDB(strapi, userId, action),
    reduceRemainMints: async (strapi, userId) => await _reduceRemainMints_mod(strapi, userId),
    increaseRemainMints: async (strapi, userId) => await _increaseRemainMints_mod(strapi, userId),
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
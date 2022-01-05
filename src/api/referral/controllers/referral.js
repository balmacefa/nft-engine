'use strict';

/**
 *  referral controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { sanitize } = require('@strapi/utils');

const findCouponByUser = async (strapi, userId) => {
    const referralAPI = strapi.db.query('api::referral.referral');

    // find referral with stripe_id
    return await referralAPI.findOne({
        where: {
            user: userId
        }
    });
}

module.exports = createCoreController('api::referral.referral', ({ strapi }) => ({

    createCoupon: async ctx => {
        strapi.log.info('ENTER POST /referral/createCoupon \n' + JSON.stringify(ctx?.request?.body));
        const stripe = strapi.service('api::package-order.package-order').stripe();
        const referralAPI = strapi.service('api::referral.referral');

        const {
            couponCode,

            address_ethereum,
            address_binance,
            address_matic,
            address_celo,
            address_harmony
        } = ctx.request.body;


        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id

        if (await findCouponByUser(strapi, userId)) {
            return ctx.throw(409, `ERROR: user already has a coupon`);
        }

        let promotionCode;

        try {
            promotionCode = await stripe.promotionCodes.create({
                coupon: strapi.config.get('server.stripe_discount_code_referrals'),
                ...(couponCode.length > 0) && { code: couponCode },
                metadata: {
                    strapi_user_id: userId,
                    address_ethereum,
                    address_binance,
                    address_matic,
                    address_celo,
                    address_harmony
                },
                active: true,
            });
            strapi.log.debug("Stripe promotionCode: \n" + JSON.stringify(promotionCode));

        } catch (err) {
            strapi.log.error(`ERROR: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.throw(409, `ERROR: ${err.message}`);
        }
        try {
            // Register the order in the database
            const entity = await referralAPI.create(
                {
                    data: {
                        stripe_id: promotionCode.id,
                        stripePromotionCodeObj: promotionCode,
                        user: userId,
                    }
                }
            );
            strapi.log.info('EXIT POST /referral/createCoupon with: \n' + JSON.stringify(entity));
            return entity;
        } catch (err) {
            strapi.log.error(`ERROR: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.throw(400, `ERROR: \n ${err.message}`);
        }
    },
    revokeCoupon: async ctx => {
        strapi.log.info('ENTER POST /referral/revokeCoupon');
        const stripe = strapi.service('api::package-order.package-order').stripe();
        const referralAPI = strapi.service('api::referral.referral');

        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id

        // const { id } = ctx.params;
        // const { query } = ctx;
        const couponEntity = await findCouponByUser(strapi, userId);
        if (!couponEntity) {
            return ctx.throw(404, `ERROR 404: user do not has a coupon`);
        }

        let promotionCode;

        try {
            promotionCode = await stripe.promotionCodes.update(
                couponEntity.stripe_id,
                {
                    active: false,
                });
            strapi.log.debug("Stripe promotionCode: \n" + JSON.stringify(promotionCode));
        } catch (err) {
            strapi.log.error(`ERROR: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.throw(409, `ERROR: ${err.message}`);
        }

        if (promotionCode.active) {
            return ctx.throw(409, `ERROR: coupon is still active`);
        }

        try {
            // Register the order in the database
            const entity = await referralAPI.delete(couponEntity.id);
            strapi.log.info('EXIT POST /referral/revokeCoupon with: \n' + JSON.stringify(entity));
            return entity;
        } catch (err) {
            strapi.log.error(`ERROR: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.throw(409, `ERROR: ${err.message}`);
        }

    },
    findCoupon: async ctx => {
        strapi.log.info('ENTER POST /referral/findCoupon');
        const referralAPI = strapi.service('api::referral.referral');
        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id

        const coupon = await findCouponByUser(strapi, userId);
        if (!coupon) {
            return ctx.throw(404, `ERROR 404: user do not has a coupon`);
        }
        strapi.log.info('EXIT POST /referral/findCoupon with: \n' + JSON.stringify(coupon));

        return await sanitize.contentAPI.output(coupon);
    },

}));


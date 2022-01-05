'use strict';

/**
 *  referral controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::referral.referral', ({ strapi }) => ({

    createCoupon: async ctx => {
        strapi.log.info('ENTER POST /referral/createCoupon \n' + JSON.stringify(ctx?.request?.body));
        const stripe = strapi.service('api::package-order.package-order').stripe();
        const referralAPI = strapi.service('api::referral.referral');

        const {
            address,
            couponCode,
        } = ctx.request.body;

        const user = ctx.state.user;
        let promotionCode;

        try {
            promotionCode = await stripe.promotionCodes.create({
                coupon: strapi.config.get('server.stripe_discount_code_referrals'),
                ...(couponCode.length > 0) && { code: couponCode },
                metadata: {
                    address: address,
                    strapi_user_id: "user.id", // TODO: change to user.id
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
                        stripePromotionCodeObj: promotionCode,
                        // user: user.id, TODO: uncomment this when we have the user.id
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
        const user = ctx.state.user;

        // todo: get user coupon and remove it
    },

}));


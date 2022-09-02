const controller = 'api::referral.referral';

module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/referral/createCoupon',
            handler: `${controller}.createCoupon`,
        },
        {
            method: 'POST',
            path: '/referral/revokeCoupon',
            handler: `${controller}.revokeCoupon`,
        },
        {
            method: 'GET',
            path: '/referral/findCoupon',
            handler: `${controller}.findCoupon`,
        }
    ]
}

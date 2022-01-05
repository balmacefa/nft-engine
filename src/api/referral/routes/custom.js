const controller = 'api::referral.referral';

module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/referral/createCoupon',
            handler: `${controller}.createCoupon`,
        }
    ]
}

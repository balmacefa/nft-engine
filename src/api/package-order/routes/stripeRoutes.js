const controller = 'api::package-order.package-order';

module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/package-order/checkout-session',
            handler: `${controller}.createCheckoutSession`,
        },
        {
            method: 'POST',
            path: '/package-order/webhook/fulfill-order',
            handler: `${controller}.webhookFulfillOrder`,
        }
    ]
}

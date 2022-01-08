module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '0c102b187b3d9e4acb87c55f2d261674'),
    },
  },
  watchIgnoreFiles: [
    '**/config-sync/files/**',
  ],
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  stripe_success_url: env('STRIPE_SUCCESS_URL'),
  stripe_cancel_url: env('STRIPE_CANCEL_URL'),
  stripe_api_key: env('STRIPE_API_KEY'),
  stripe_webhook_secret: env('STRIPE_WEBHOOK_SECRET'),
  stripe_discount_code_referrals: env('STRIPE_DISCOUNT_CODE_REFERRALS', 'STANDARD_REFERRAL_COUPON_CODE'),
  bull_mq_config: {
    connection: {
      host: env('REDIS_HOST', 'localhost'),
      port: env.int('REDIS_PORT', 6379),
      maxRetriesPerRequest: null,
      enableReadyCheck:false
    },
    queueOptions: {
      defaultJobOptions: {
        attempts: env.int('BULL_RETRY_ATTEMPTS', 5),
        backoff: {
          type: env('BULL_BACK_OFF_TYPE', "exponential"),
          delay: env.int('BULL_BACK_OFF_DELAY', 1000),
        }
      }
    }
  }
});

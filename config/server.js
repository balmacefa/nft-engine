module.exports = ({ env }) => ({
  host: env('HOST', 'localhost'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '0c102b187b3d9e4acb87c55f2d261674'),
    },
  },
  app: {
    keys: env("APP_KEYS", "testKey1;testKey2").split(";"),
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
  tiktok_api_axios_config: {
    baseURL: env('TIKTOK_API_URL'),
    timeout: env.int('TIKTOK_API_TIMEOUT', 50000),
    auth: {
      username: env('TIKTOK_API_USER_KEY'),
      password: env('TIKTOK_API_PASSWORD_KEY'),
    },
  },
  tatum_api_axios_config: {
    baseURL: env('TATUM_API_URL'),
    headers: {
      'x-api-key': env('TATUM_API_KEY')
    }
  },
  tatum: {
    signatureId: env('TATUM_SIGNATURE_ID'),
    retryDelay: env.int('TATUM_RETRY_DELAY', 1000),
    retries: env.int('TATUM_RETRIES', 5),
    waitSigning: env.int('TATUM_WAIT_SIGNING', 5000),
    fixedRoyalty: {
      amount: env.float('TATUM_FIXED_ROYALTY_AMOUNT'),
      walletAddress: env('TATUM_FIXED_ROYALTY_WALLET_ADDRESS')
    }
  },
  pinata: {
    apiKey: env("PINATA_API_KEY"),
    secret: env("PINATA_SECRET"),
  }
});

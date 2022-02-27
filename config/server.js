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
  tatum_axios_instance: {
    axiosConfig: {
      baseURL: env('TATUM_API_URL'),
      headers: {
        'x-api-key': env('TATUM_API_KEY')
      }
    },
    axiosRetry: {
      retryDelay: env.int('TATUM_RETRY_DELAY', 1000),
      retries: env.int('TATUM_RETRIES', 5),
      statusCodes: env.array('TATUM_RETRY_CONDITION', ['429', '500', '502', '503', '504']),
    }
  },
  pinata_axios_instance: {
    axiosConfig: {
      baseURL: env('PINATA_API_URL', 'https://api.pinata.cloud/pinning'),
      headers: {
        authorization: env("PINATA_JWT"),
      }
    },
    axiosRetry: {
      retryDelay: env.int('PINATA_RETRY_DELAY', 1000),
      retries: env.int('PINATA_RETRIES', 5),
      statusCodes: env.array('PINATA_RETRY_CONDITION', ['429', '500', '502', '503', '504']),
    }
  },
  tatum: {
    signatureId: env('TATUM_SIGNATURE_ID'),
    waitSigning: env.int('TATUM_WAIT_SIGNING', 2000),
    // 30 min
    maxWaitSigning: env.int('TATUM_MAX_WAIT_SIGNING', 1800000),
    fixedRoyalty: {
      amount: env.float('TATUM_FIXED_ROYALTY_AMOUNT'),
      walletAddress: env('TATUM_FIXED_ROYALTY_WALLET_ADDRESS')
    }
  }
});

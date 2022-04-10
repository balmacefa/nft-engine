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
  frontend_cors:
  {
    origin: env('FRONTEND_URL', 'http://localhost:3000'),
    methods: ['GET', 'POST'],
    // allowedHeaders: ['my-header', 'Content-Type', 'Authorization'],
    // credentials: true
  },

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
      },
      maxBodyLength: 'Infinity'
    },
    axiosRetry: {
      retryDelay: env.int('TATUM_RETRY_DELAY', 1000),
      retries: env.int('TATUM_RETRIES', 5),
    }
  },
  pinata_axios_instance: {
    axiosConfig: {
      baseURL: env('PINATA_API_URL', 'https://api.pinata.cloud/pinning'),
      headers: {
        // Authorization: `Bearer ${env("PINATA_JWT")}`,
        pinata_api_key: env("PINATA_API_KEY"),
        pinata_secret_api_key: env("PINATA_SECRET")
      },
      maxBodyLength: 'Infinity'
    },
    axiosRetry: {
      retryDelay: env.int('PINATA_RETRY_DELAY', 1000),
      retries: env.int('PINATA_RETRIES', 5),
      maxWaitSigning: env.int('PINATA_MAX_WAIT_SIGNING', 5000),
    }
  },
  tatum: {
    signatureId: env('TATUM_SIGNATURE_ID'),
    fixedRoyalty: {
      amount: env.float('TATUM_FIXED_ROYALTY_AMOUNT'),
      walletAddress: env('TATUM_FIXED_ROYALTY_WALLET_ADDRESS'),
      maxWaitSigning: env.int('PINATA_MAX_WAIT_SIGNING', 5000)
    },
    TATUM_USE_TEST_NET: env.bool('TATUM_USE_TEST_NET'),
    TATUM_KMS_PASSWORD: env('TATUM_KMS_PASSWORD')
  },
  retryLoop: {
    maxWaitTimeLoop: env.int('RETRY_LOOP_MAX_WAIT_TIME', 5000),
    sleepWaitTimeLoop: env.int('RETRY_LOOP_SLEEP_WAIT_TIME', 1000),
  },
  rapidapi:{
    proxySecret: env('X_RAPID_API_PROXY_SECRET')
  }
});

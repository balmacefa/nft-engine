const redisConfig = require('redis-url').parse(process.env.REDIS_URL)

module.exports = ({ env }) => ({
  bull_mq_config: {
    connection: {
      host: env('REDIS_HOST', redisConfig?.host || 'localhost'),
      port: env.int('REDIS_PORT', redisConfig?.port || 6379),
      password: env('REDIS_PASSWORD', redisConfig?.pass || null),

      maxRetriesPerRequest: null,
      enableReadyCheck: false
    },
    queueOptions: {
      // https://github.com/taskforcesh/bullmq/blob/bc533ca119600f92caca020dd280c1011e849417/docs/gitbook/api/bullmq.jobsoptions.md
      defaultJobOptions: {
        attempts: env.int('BULL_RETRY_ATTEMPTS', 5),
        backoff: {
          type: env('BULL_BACK_OFF_TYPE', "exponential"),
          delay: env.int('BULL_BACK_OFF_DELAY', 1000),
        },
        removeOnComplete: true,
        removeOnFail: true
      }
    }
  }
});

'use strict';
const { Queue, QueueScheduler } = require('bullmq');
const { Worker } = require('bullmq');
const IORedis = require('ioredis');

const CacheManager = require('cache-manager');
const RedisStore = require('cache-manager-ioredis');

module.exports = ({ strapi }) => {
  strapi.log.info('nft-engine: server: bootstrap: start');

  const mainController = strapi
    .plugin('nft-engine')
    .controller('engineController');
  const config = strapi.config.get('redis.bull_mq_config');

  const queueName = 'mint-nft-queue';
  strapi.log.info(JSON.stringify(config.connection));

  const queue = new Queue(queueName, { ...config.queueOptions, connection: new IORedis(config.connection) });
  // this is to retry when the job fails
  new QueueScheduler(queueName);

  // Create a worker
  const worker = new Worker(queueName,
    async (job) => await mainController.mintNFTJob(job)
    , {
      connection: new IORedis(config.connection)
    }
  );
  worker.on('completed', (job, returnValue) => mainController.mintNFTJobCompleted(job, returnValue));
  worker.on('progress', (job, progress) => mainController.mintNFTJobProgress(job, progress));
  worker.on('failed', (job, failedReason) => mainController.mintNFTJobFailed(job, failedReason));

  worker.on('error', err => {
    // This is to avoid NodeJS raising an unhandled exception when an error occurs.
    strapi.log.error("Worker error: \n" + JSON.stringify(err));
  });

  // redis cache
  const redisCache = CacheManager.caching({
    store: RedisStore,
    redisInstance: new IORedis(config.connection)
  });

  // listen for redis connection error event
  redisCache.store.getClient().on('error', err => {
    // This is to avoid NodeJS raising an unhandled exception when an error occurs.
    strapi.log.error("Redis Cache error: \n" + JSON.stringify(err));
  });

  strapi.plugin('nft-engine').bull = {
    worker,
    queue,
  };
  strapi.plugin('nft-engine').redisCache = redisCache;
  strapi.plugin('nft-engine').redisCacheDelKey = (key) => redisCache.del(key);
};

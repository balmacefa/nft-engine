'use strict';
const { Queue, QueueScheduler } = require('bullmq');
const { Worker } = require('bullmq');
const IORedis = require('ioredis');

module.exports = ({ strapi }) => {
  strapi.log.info('nft-engine: server: bootstrap: start');

  const mainController = strapi
    .plugin('nft-engine')
    .controller('engineController');
  const config = strapi.config.get('server.bull_mq_config');

  const queueName = 'mint-nft-queue';
  const client = new IORedis(config.connection);
  const queue = new Queue(queueName, { ...config.queueOptions, client });
  // this is to retry when the job fails
  new QueueScheduler(queueName);

  // Create a worker
  const worker = new Worker(queueName,
    async (job) => await mainController.mintNFTJob(job)
    ,
    {
      client
    }
  );
  worker.on('completed', (job, returnValue) => mainController.mintNFTJobCompleted(job, returnValue));
  worker.on('progress', (job, progress) => mainController.mintNFTJobProgress(job, progress));
  worker.on('failed', (job, failedReason) => mainController.mintNFTJobFailed(job, failedReason));

  worker.on('error', err => {
    // This is to avoid NodeJS raising an unhandled exception when an error occurs.
    strapi.log.error("Worker error: \n" + JSON.stringify(err));
  });

  strapi.plugin('nft-engine').bull = {
    worker,
    queue,
  };
};

'use strict';
const _ = require('lodash');
const { Queue, QueueScheduler } = require('bullmq');
const { Worker } = require('bullmq');
const IORedis = require('ioredis');

const CacheManager = require('cache-manager');
const RedisStore = require('cache-manager-ioredis');
const CacheKey = require('../../../api/utils/CacheKeys.js');
const { createAdapter } = require('@socket.io/redis-adapter');

const EventEmitter = require('eventemitter3');

// // socket.io
const { Server } = require("socket.io");

// lodash
const queueName = 'mint-nft-queue';

module.exports = ({ strapi }) => {
  strapi.log.info('nft-engine: server: bootstrap: start');

  const mainController = strapi
    .plugin('nft-engine')
    .controller('engineController');
  const config = strapi.config.get('redis.bull_mq_config');

  const connection = new IORedis(config.connection)
  const queue = new Queue(queueName, { ...config.queueOptions, connection });
  // this is to retry when the job fails
  const qs = new QueueScheduler(queueName, { connection });

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

  const io = new Server(strapi.server.httpServer, {
    cors: strapi.config.get('server.frontend_cors')
  });
  const ioChannels = {};
  // cache ioChannels in  
  const key = CacheKey.ioChannels;

  try {

    io.adapter(createAdapter(connection, connection.duplicate(),
      {
        key: key,
        publishOnSpecificResponseChannel: true
      }));

    // max number of clients per channel is 10
    io.on('connection', (socket) => {
      socket.on('channel', function (channel) {
        if (channel) {
          if (!ioChannels[channel]) {
            ioChannels[channel] = {
              clients: [],
              maxClients: 10,
            };
          }
          if (ioChannels[channel].clients.length < ioChannels[channel].maxClients) {
            // check if socket already
            if (ioChannels[channel].clients.indexOf(socket.id) === -1) {

              ioChannels[channel].clients.push(socket.id);
              socket.join(channel);
            }
          }
        }
      });


      // on disconnect
      socket.on('disconnect', () => {
        // remove socket id from channel
        if (ioChannels[socket.channel]) {
          const index = ioChannels[socket.channel].clients.indexOf(socket.id);
          if (index > -1) {
            ioChannels[socket.channel].clients.splice(index, 1);
          }
        }
      });
    });
    // https://github.com/socketio/socket.io-redis-adapter#with-ioredishttpsgithubcomluinioredis-client


  } catch (err) {
    strapi.log.error(err);
  }

  // generic subscribe for generic handling
  strapi.db.lifecycles.subscribe((event) => {
    if (event?.model?.uid === 'api::package-order.package-order') {
      const actions = ['afterCreate', 'afterUpdate', 'afterDelete'];
      // if event.action in list
      if (actions.includes(event.action)) {
        const key = CacheKey.countRemainMints(_.get(event, "params.data.user"));
        strapi.log.debug('removing cache for key: ' + key);
        redisCache.del(key);
      }
    }
  });


  // Create a worker
  const worker = createWorker(mainController, connection, strapi, io);

  strapi.plugin('nft-engine').bull = {
    worker,
    queue
  };
  // strapi.plugin('nft-engine').eventEmitter = createEvenEmitter();
  strapi.plugin('nft-engine').redisCache = redisCache;
  strapi.plugin('nft-engine').redisCacheDelKey = (key) => redisCache.del(key);
};


function createEvenEmitter(io) {
  const eventEmitter = new EventEmitter();


  eventEmitter.once('pushToChannel', ({ channel, topic, payload }) => {
    io.to(channel).emit(topic, payload);
  });
  return eventEmitter;
}

// Example 📖📖📖
// EventEmitter.emit('pushToChannel', {
//   channel: job.id, topic: topic, payload: {
//     job: OmitDeep(job, pluckSelect),
//     workerValue: workerValue,
//     topic: topic
//   }
// });

function createWorker(mainController, connection, strapi, io) {

  const worker = new Worker(queueName,
    async (job) => await mainController.mintNFTJob(job),
    {
      connection
    }
  );

  worker.on('completed', (job, returnValue) => mainController.mintNFTJobCompleted(job, returnValue, io));
  worker.on('progress', (job, progress) => mainController.mintNFTJobProgress(job, progress, io));
  worker.on('failed', (job, failedReason) => mainController.mintNFTJobFailed(job, failedReason, io));

  worker.on('error', err => {


    // This is to avoid NodeJS raising an unhandled exception when an error occurs.
    // err.message = 'Missing lock for job 7073556383794318634. failed';
    const extractJobId = err.message.match(/job (\d+)/);

    if (extractJobId) {
      try {
        mainController.workerError(extractJobId, err, io);
        io.to(extractJobId).emit('job-failed', err);
      } catch (e) {
        strapi.log.error("Worker error [extractJobId]: \n" + JSON.stringify(e));
      }
    }


    strapi.log.error("Worker error: \n" + JSON.stringify(err));
    strapi.log.error("Worker error: restarting worker ???????????????????????!!!!!!!!!!!!!!!!");
  });
  return worker;
}


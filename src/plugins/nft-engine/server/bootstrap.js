'use strict';
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
const _ = require('lodash');

module.exports = ({ strapi }) => {
  strapi.log.info('nft-engine: server: bootstrap: start');

  const mainController = strapi
    .plugin('nft-engine')
    .controller('engineController');
  const config = strapi.config.get('redis.bull_mq_config');

  const queueName = 'mint-nft-queue';

  const connection = new IORedis(config.connection)
  const queue = new Queue(queueName, { ...config.queueOptions, connection });
  // this is to retry when the job fails
  const qs = new QueueScheduler(queueName, { connection });

  // Create a worker
  const worker = new Worker(queueName,
    async (job) => await mainController.mintNFTJob(job)
    , {
      connection
    }
  );
  // worker.on('completed', (job) => {
  //   const jobId = job.data.jobId;
  //   if (ioChannels[jobId]) {
  //     ioChannels[jobId].forEach(id => {
  //       io.to(id).emit('job-completed', job);
  //     });
  //   }
  // }

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



  // EventEmitter
  //   var EE = new EventEmitter()
  //   , context = { foo: 'bar' };

  // function emitted() {
  //   console.log(this === context); // true
  // }

  // EE.once('event-name', emitted, context);
  // EE.on('another-event', emitted, context);
  // EE.removeListener('another-event', emitted, context);
  // emitter.emit('foo.bar', 1, 2); // 'foo.bar' 1 2

  const eventEmitter = new EventEmitter();


  const io = new Server(strapi.server.httpServer, {
    cors: strapi.config.get('server.frontend_cors')
  });
  const ioChannels = {};
  // cache ioChannels in  
  const key = CacheKey.ioChannels;

  try {

    // io.adapter(createAdapter(connection, connection.duplicate(),
    //   {
    //     key: key,
    //     publishOnSpecificResponseChannel: true
    //   }));

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

    eventEmitter.once('pushToChannel', ({ channel, topic, payload }) => {
      io.to(channel).emit(topic, payload);
    });
    // emitter.emit('foo.bar', 1, 2); // 'foo.bar' 1 2
    // emit push to channel


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


  strapi.plugin('nft-engine').bull = {
    worker,
    queue
  };
  strapi.plugin('nft-engine').eventEmitter = eventEmitter;
  strapi.plugin('nft-engine').redisCache = redisCache;
  strapi.plugin('nft-engine').redisCacheDelKey = (key) => redisCache.del(key);
};

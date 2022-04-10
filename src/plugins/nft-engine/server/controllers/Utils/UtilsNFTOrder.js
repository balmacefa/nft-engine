'use strict';

/**
 *  nft-mint-order controller
 */

// get lodash
const _ = require('lodash');

/**
 *
 * Initializer
 * This function handle the rapidApi request
 * Create a new object and add it to the redis queue
 *
 */

const compileIpfsFiles = async (ctx, strapi, uploadIpfsFiles) => {
  //   uploadIpfsFiles = [
  //   //   {
  //   //   filepath, // This is address when the file is store temp
  //   //   setMetaDataPath: '_.set(nftMetadata, this.setMetaDataPath, this.ipfs);',
  //   //   pinataMetaData,
  //   //   ipfs,
  //   // }
  // ],
  const uploader = strapi.service('plugin::upload.upload');
  await uploader.upload(ctx);

  let img;
  for (let i = 0; i < ctx.body.length; i++) {
    try {
      img = ctx.body[0];
      // img.url;

    } catch (error) {
      strapi.log.debug('Error loading files', JSON.stringify(error));
    }
  }


};
const createNewOrderJob = async (strapi, ctx) => {

  strapi.log.info('ENTER POST /nft-mint-order/createMintNFTOrder');
  const nftMintOrderDB = strapi.db.query('api::nft-mint-order.nft-mint-order');

  const userId = ctx.state.rapidApi.user;

  const {
    nftMintOrder: { // is is from User input
      sendAddress,
      blockchain,
      tokenId,
      collectionName,
      symbol,
      royalties,
      // [
      //   // {
      //   //   address: "",
      //   //   splitRoyaltyRate: 0,
      //   // }
      // ],

      // This is added by the system
      // transactionId: null,
      // contractAddress: null,
      // status: 'pending',
      // user: 'userId',
    },
    uploadIpfsFiles: user__uploadIpfsFiles,
    //   uploadIpfsFiles = [
    //   //   {
    //   //   filepath, // This is address when the file is store temp
    //   //   setMetaDataPath: '_.set(nftMetadata, this.setMetaDataPath, this.ipfs);',
    //   //   pinataMetaData,
    //   //   ipfs,
    //   // }
    // ],
    nftMetadata
  } = ctx.request.body;

  const compiledIpfsFiles = await compileIpfsFiles(strapi, ctx, user__uploadIpfsFiles);
  let entity;
  try {
    entity = await nftMintOrderDB.findOne({
      where: {
        user: userId,
        collectionName,
        tokenId,
        symbol
      }
    });

    if (!entity) {
      entity = await nftMintOrderDB.create(
        {
          data: {
            sendAddress,
            blockchain,
            collectionName,
            tokenId,
            royalties,
            nftMetadata,
            // This is added by the system later
            // transactionId: null,
            // contractAddress:null,
            status: 'pending',
            user: userId,
          }
        }
      );
    }
  } catch (err) {
    strapi.log.error(`ERROR: \n ${err.message}`);
    strapi.log.error(JSON.stringify(err));
    return ctx.badRequest(`Error while creating mint order`);
  }

  try {
    const jobData = {
      nftMintOrderEntity: entity,
      nftContractAddress: {
        user: userId,
        blockchain,
        name: collectionName,
        symbol
      },
      uploadIpfsFiles: compiledIpfsFiles,
      userId
    };

    // const jobId = user: userId,
    // collectionName,
    // tokenId,
    // symbol
    const jobId = `${userId}____${collectionName}____${symbol}____${tokenId}`;

    const queue = strapi
      .plugin('nft-engine')
      .bull.queue;
    // bullMQ
    // find by project id
    const job = await queue.getJob(jobId);
    let createJob = true;
    if (job) {
      strapi.log.info(`Job already exists for ${jobId}`);
      if (job.attemptsMade >= job.opts.attempts) {
        // remove job from queue
        await job.remove();
        strapi.log.info(`Job removed from queue for ${jobId} due to max attempts`);
      } else {
        // job is already in queue
        strapi.log.info(`Job already exists for ${jobId} and will be retried`);
        createJob = false;
      }
    }

    if (createJob) {
      const data = await queue.add('mint-nft', { ...jobData },
        {
          jobId,
        }
      );
      strapi.log.debug(`Job Created: \n ${JSON.stringify(data)}`);
    }

  } catch (err) {
    strapi.log.error(`ERROR: \n ${err.message}`);
    strapi.log.error(JSON.stringify(err));
    return ctx.badRequest(`Error while creating mint order job \n ${err.message}`);
  }
  strapi.log.info(`EXIT POST /nft-mint-order/createMintNFTOrder \n ${entity}`);
  return entity;
};

const getListByUser = async (strapi, ctx) => {
  strapi.log.info('ENTER GET /nft-mint-order/getListByUser');

  const nftMintOrderController = strapi.controller('api::nft-mint-order.nft-mint-order');
  const userId = ctx.state.rapidApi.user;

  let {
    page,
    pageSize
  } = ctx.request.query;
  // set default values and parse to int
  page = parseInt(page || 0);
  // clamp pageSize between 1 and 200
  pageSize = Math.max(1, Math.min(parseInt(pageSize || 10), 200));

  const entities = await nftMintOrderController.find(
    {
      query: {
        filters: {
          user: userId
        },
        pagination: {
          page,
          pageSize,
        },
        sort: [
          {
            // newest first
            createdAt: 'DESC'
          }
        ]
      }
    }
  );

  strapi.log.info(`EXIT GET /nft-mint-order/getListByUser \n ${JSON.stringify(entities)}`);
  return entities;
};

module.exports = {
  createNewOrderJob,
  getListByUser
};


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

const processRapidAPiPayload = (ctx) => {
  try {

    let {
      nftMintOrder,
      uploadIpfsFiles,
      nftMetadata,
      webhooks
    } = ctx.request.body;

    if (_.isString(nftMintOrder)) {
      nftMintOrder = JSON.parse(nftMintOrder);
    }

    if (_.isString(uploadIpfsFiles)) {
      uploadIpfsFiles = JSON.parse(uploadIpfsFiles);
    }

    if (_.isString(nftMetadata)) {
      nftMetadata = JSON.parse(nftMetadata);
    }
    if (_.isString(webhooks)) {
      webhooks = JSON.parse(webhooks);
    }

    return {
      nftMintOrder,
      uploadIpfsFiles,
      nftMetadata,
      webhooks
    };

  } catch (error) {
    ctx.badRequest(`Error while parsing request body \n ${error.message}`);
  }

};
const createNewOrderJob = async (strapi, ctx) => {

  strapi.log.info('ENTER POST /nft-mint-order/createMintNFTOrder');
  const nftMintOrderDB = strapi.db.query('api::nft-mint-order.nft-mint-order');

  const userId = ctx.state.rapidApi.user;
  const {
    nftMintOrder: {
      sendAddress,
      blockchain,
      tokenId,
      collectionName,
      symbol,
      royalties,
    },
    uploadIpfsFiles,
    nftMetadata,
    webhooks
  } = processRapidAPiPayload(ctx);


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
      const rapidApiRequestHeaders = _.omit(ctx.state.rapidApi.headers, ['x-rapidapi-proxy-secret']);
      entity = await nftMintOrderDB.create(
        {
          data: {
            sendAddress,
            blockchain,
            collectionName,
            tokenId,
            royalties,
            nftMetadata,
            uploadIpfsFiles,
            symbol,
            status: 'pending',
            user: userId,
            rapidApiRequestHeaders
            // This is added by the system later
            // transactionId: null,
            // contractAddress:null,
            // nftMetadataIPFS: null,
            // signatureId: null,
          }
        }
      );
    }
  } catch (err) {
    strapi.log.error(`ERROR: \n ${err.message}`);
    strapi.log.error(JSON.stringify(err));
    return ctx.badRequest(`Error while creating mint order`);
  }

  if(entity.status === 'minted'){
    strapi.log.info(`NFT mint order already minted`);
    return ctx.badRequest(`NFT mint order already minted`);
  }

  try {
    // TODO: REVIEW THIS, TO CHANGE TEST NET OR PRODUCTION
    const tatum_use_test_net = strapi.config.get('server.tatum.TATUM_USE_TEST_NET');

    const jobData = {
      nftMintOrderEntity: entity,
      webhooks,
      tatum_use_test_net
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


'use strict';
const _ = require('lodash');
// const ORDERS = require('./../../../../api/nft-mint-order/controllers/nft-mint-order');
const OmitDeep = require('omit-deep');

const pluckSelect = ['tikTokVideoMetadata', '_id', 'created_at', 'published_at', 'createdAt', '__v'];

const sendJobToClient = async (job, strapi, topic, workerValue, io) => {

  // topics:
  // mintNFTJobCompleted
  // mintNFTJobProgress
  // mintNFTJobFailed

  strapi.log.info(`[timestamp]:[${job.timestamp}] ${topic}: jobId: ${job.id} workerValue: ${JSON.stringify(workerValue)}`);
  try {

    io.to(job.id).emit(topic,
      {
        job: OmitDeep(job, pluckSelect),
        workerValue: workerValue,
        topic: topic
      }
    );

  } catch (err) {
    strapi.log.error(`[job_timestamp]:[${job.timestamp}] topic:${topic}: jobId: ${job.id} error: ${JSON.stringify(err)}`);
  }

  strapi.log.info(`[job_timestamp]:[${job.timestamp}] topic:${topic}: jobId: ${job.id} workerValue: ${JSON.stringify(workerValue)}`);
};

const updateNftMintOrderMetadata = async (nftMetadata, nftMetadataIPFS, strapi, job) => {
  const nftMintOrderDb = strapi.db.query('api::nft-mint-order.nft-mint-order');
  let nftMintOrderEntity = job.data.nftMintOrderEntity;

  nftMintOrderEntity = await nftMintOrderDb.update(
    {
      where: {
        id: nftMintOrderEntity.id
      },
      data: {
        nftMetadata,
        nftMetadataIPFS
      }
    });
    await job.updateMerge({ nftMintOrderEntity });

  return nftMintOrderEntity;
};

const handleLastAttemptFailed = async (jobId, strapi) => {
  // update package-order payment
  const PackageOrderController = strapi.controller('api::package-order.package-order');
  const result = await PackageOrderController.increaseRemainMints(strapi);
  if (result) {
    // set status to refunded
    const nftMintOrderEntity = await strapi.db.query('api::nft-mint-order.nft-mint-order').update(

      {
        where: {
          id: jobId
        },
        data: {
          status: 'refunded'
        }
      });
    await job.updateMerge({ nftMintOrderEntity });
  } else {
    // ThrowError
    return throwError(`You have no remaining balance to mint, please purchase more packages mints`);
  }
};

const job_prop_check_update = async (job, property_name, cb) => {
  let result = _.get(job, `data.${property_name}`);
  if (_.isNil(result)) {
    result = await cb();
    await job.updateMerge({
      [property_name]: result
    });
  }
  return result;
};


module.exports = {
    sendJobToClient,
    updateNftMintOrderMetadata,
    handleLastAttemptFailed,
    job_prop_check_update
};

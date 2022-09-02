'use strict';
const _ = require('lodash');
// const ORDERS = require('./../../../../api/nft-mint-order/controllers/nft-mint-order');
// const OmitDeep = require('omit-deep');
const axios = require('axios');

const jobPluckSelect = ['opts.removeOnComplete', 'opts.removeOnFail',
  'data.nftMintOrderEntity.rapidApiRequestHeaders',
  'data.nftMintOrderEntity.uploadIpfsFiles',
  'data.uploadIpfsFiles',
  'data.webhooks',
  'data.pushProgress',
  'data.updateMerge',
  'name',
  'parent',
  'parentKey',
  'prefix',
  'queue',
  'queueName',
  'toKey',
  'returnvalue' // This is duplicated by workerValue
];

const sendJobToClient = async (job, strapi, topic, workerValue) => {
  new Promise(async (resolve) => {
    // topics:
    // completed
    // progress
    // failed
    strapi.log.info(`[timestamp]:[${job.timestamp}] ${topic}: jobId: ${job.id} workerValue: ${JSON.stringify(workerValue)}`);
    try {
      const retries = 3;
      let attempt = 0;
      const webhook = _.get(job.data, `webhooks.${topic}`);

      if (_.isNil(webhook)) {
        strapi.log.error(`[timestamp]:[${job.timestamp}] ${topic}: jobId: ${job.id} webhook is null`);
        return;
      }

      const payload = {
        job: _.omit(job, jobPluckSelect),
        workerValue: workerValue,
        topic: topic
      };

      // send payload to webhook endpoint, retry 3 times if axios failed
      while (attempt < retries) {
        try {
          await axios.post(webhook, payload);
          break;
        } catch (error) {
          strapi.log.error(`[timestamp]:[${job.timestamp}] ${topic}: jobId: ${job.id} attempt: ${attempt} error: ${error}`);
          attempt++;
        }
      }

    } catch (err) {
      strapi.log.error(`[job_timestamp]:[${job.timestamp}] topic:${topic}: jobId: ${job.id} error: ${JSON.stringify(err)}`);
    }
    resolve(true);
  });

};

const updateNftMintOrderMetadata = async (nftMetadata, nftMetadataIPFS, strapi, job) => {
  const nftMintOrderDb = strapi.db.query('api::nft-mint-order.nft-mint-order');
  let nftMintOrderEntity = job.data.nftMintOrderEntity;

  // At this point we have all the data we need to mint the NFT
  // and uploadIpfsFiles is no longer needed, so we can remove it
  // from the job
  nftMintOrderEntity = await nftMintOrderDb.update(
    {
      where: {
        id: nftMintOrderEntity.id
      },
      data: {
        nftMetadata,
        nftMetadataIPFS,
        uploadIpfsFiles: null
      }
    });
  await job.updateMerge(
    {
      nftMintOrderEntity,
      uploadIpfsFiles: null
    }
  );

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
    throw new Error(`You have no remaining balance to mint, please purchase more packages mints`);
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

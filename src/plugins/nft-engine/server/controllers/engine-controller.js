'use strict';

const { getOrCreateContractAddress } = require('./contract-address-step.js');
const { getIpfsCoverAndVideo } = require('./ipfs-cover-video-step.js');
const { getTiktokMetadata, uploadTiktokMetadataToIPFS } = require('./build-metadata-step.js');
const { mintTiktokNFT } = require('./mint-nft-step.js');
const _ = require('lodash');
// const ORDERS = require('./../../../../api/nft-mint-order/controllers/nft-mint-order');
const OmitDeep = require('omit-deep');

const pluckSelect = ['_id', 'created_at', 'published_at', 'createdAt', '__v'];

const sendJobToClient = async (job, strapi, topic, workerValue) => {

  // strapi.log.info('ENTER mintNFTJobCompleted');
  // info topic
  strapi.log.info(`[timestamp]:[${job.timestamp}] ${topic}: jobId: ${job.id} workerValue: ${JSON.stringify(workerValue)}`);
  try {

    const EventEmitter = strapi.plugin('nft-engine').eventEmitter;
    EventEmitter.emit('pushToChannel', {
      channel: job.id, topic: topic, payload: {
        job: OmitDeep(job, pluckSelect),
        workerValue: workerValue,
        topic: topic
      }
    });
  } catch (err) {
    strapi.log.error(`[job_timestamp]:[${job.timestamp}] topic:${topic}: jobId: ${job.id} error: ${JSON.stringify(err)}`);
  }

  strapi.log.info(`[job_timestamp]:[${job.timestamp}] topic:${topic}: jobId: ${job.id} workerValue: ${JSON.stringify(workerValue)}`);
};

const updateNftMintOrderMetadata = async (nftMetadata, nftMetadataIPFS, strapi, job) => {
  const nftMintOrderDb = strapi.db.query('api::nft-mint-order.nft-mint-order');
  let mintOrderEntity = job.data.nftMintOrderEntity;

  mintOrderEntity = await nftMintOrderDb.update(
    {
      where: {
        id: mintOrderEntity.id
      },
      data: {
        nftMetadata,
        nftMetadataIPFS
      }
    });
  return mintOrderEntity;
}

module.exports = ({ strapi }) => ({
  mintNFTJob: async job => {
    strapi.log.info('ENTER mintNFTJob');

    // ----------------------------------------------------------------
    // Utils 🥇🤖
    // ----------------------------------------------------------------
    job.__proto__.updateMerge = async function (obj) {
      await job.update(_.merge(job.data, obj));
    };
    job.__proto__.pushProgress = function (progress) {

      // if progress is array _
      const concat = [];
      if (_.isArray(progress)) {
        const lastProgress = this.progress[this.progress.length - 1];
        if (lastProgress && lastProgress.msg === progress.msg) {
          progress.count = lastProgress ? lastProgress.count + 1 : 1;
          concat.push(progress);
        }
      }
      // add timestamp
      progress.timestamp = new Date();

      this.updateProgress(_.concat(this.progress || [], progress, concat));
    };
    const nftMintOrderDb = strapi.db.query('api::nft-mint-order.nft-mint-order');


    let nftMintOrderEntity = await nftMintOrderDb.findOne({
      where: {
        id: _.get(job, "data.nftMintOrderEntity.id")
      }
    });
    job.updateMerge({ nftMintOrderEntity })
    // ----------------------------------------------------------------
    // ................................................................
    // Utils 🥇🤖
    // ................................................................

    // ----------------------------------------------------------------
    // Filter
    // ----------------------------------------------------------------

    if (_.isNil(_.get(job, "data.nftMintOrderEntity"))) {
      return throwError(`Error while getting mint order entity for ${_.get(job, "data.nftMintOrderEntity.id")}`);
    }

    if (_.get(job, "data.nftMintOrderEntity.status") === "minted") {
      // log and return
      strapi.log.info(`mintNFTJob: minted already for ${_.get(job, "data.nftMintOrderEntity.id")}`);
      return _.get(job, "data.nftMintOrderEntity")
    }

    // if is job first attempts
    const PackageOrderController = strapi.controller('api::package-order.package-order');
    const userId = job.data.userId;
    let decLastPackageOrder = await PackageOrderController.getReducerPackageOrderDB(strapi, userId)
    if (_.get(job, "attemptsMade") <= 1) {
      // 🤑🤑🤑 reduce one package-order payment
      if (_.isNil(decLastPackageOrder)) {
        return ctx.PaymentRequired('You have no remaining balance to mint, please purchase more packages mints');
      }
      // update package-order payment
      await PackageOrderController.reduceRemainMints(strapi, decLastPackageOrder);
    }
    // ................................................................
    // Filter
    // ................................................................


    // ----------------------------------------------------------------
    // 👨‍🏭⛑ Create Progress
    // ----------------------------------------------------------------

    let nftContractEntity = _.get(job, "data.nftContractEntity")
    if (_.isNil(nftContractEntity)) {
      nftContractEntity = await getOrCreateContractAddress(strapi, job);
      job.updateMerge({ nftContractEntity });
    }

    let coverVideoIPFS = _.get(job, "data.coverVideoIPFS")
    if (_.isNil(coverVideoIPFS)) {
      coverVideoIPFS = await getIpfsCoverAndVideo(strapi, job);
      job.updateMerge({ coverVideoIPFS });
    }

    let nftMetadata = _.get(job, "data.nftMetadata")
    if (_.isNil(nftMetadata)) {
      nftMetadata = await getTiktokMetadata(coverVideoIPFS, strapi, job);
      job.updateMerge({ nftMetadata });
    }

    let nftMetadataUrl = _.get(job, "data.nftMetadataUrl")
    if (_.isNil(nftMetadataUrl)) {
      // upload metadata to IPFS
      const nftMetadataUrl = await uploadTiktokMetadataToIPFS(nftMetadataUrl, strapi, job);
      job.updateMerge({ nftMetadataUrl });
    }

    nftMintOrderEntity = _.get(job, "data.nftMintOrderEntity")
    if (_.isNil(nftMintOrderEntity)) {
      // save data to show on strapi
      nftMintOrderEntity = await updateNftMintOrderMetadata(nftMetadata, nftMintOrderEntity, strapi, job);
      job.updateMerge({ nftMintOrderEntity });
    }

    nftMintOrderEntity = _.get(job, "data.mintOrderEntity")
    if (_.isNil(nftMintOrderEntity)) {
      // mint NFT
      nftMintOrderEntity = await mintTiktokNFT(nftMetadataUrl, strapi, job);
      job.updateMerge({ nftMintOrderEntity });
    }

    // ................................................................
    // Create Progress
    // ................................................................

    return nftMintOrderEntity
  },
  mintNFTJobCompleted: async (job, returnValue) => {
    sendJobToClient(job, strapi, "mintNFTJobCompleted", returnValue)
  },
  mintNFTJobProgress: async (job, progress) => {
    sendJobToClient(job, strapi, "mintNFTJobProgress", progress)
  },
  mintNFTJobFailed: async (job, failedReason) => {
    // check if is last attempt and increase order-packages mints
    if (_.get(job, "attemptsMade") >= _.get(job, "opts.attempts")) {
      const PackageOrderController = strapi.controller('api::package-order.package-order');
      await PackageOrderController.increaseRemainMints(strapi);
    }

    sendJobToClient(job, strapi, "mintNFTJobFailed", failedReason);
  }
});

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

  const EventEmitter = strapi.plugin('nft-engine').eventEmitter;
  EventEmitter.emit('pushToChannel', {
    channel: job.id, topic: topic, payload: {
      job: OmitDeep(job, pluckSelect),
      workerValue: workerValue,
      topic: topic
    }
  });


  strapi.log.info('EXIT mintNFTJobCompleted');
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
  job.data.nftMintOrderEntity = mintOrderEntity;
  return mintOrderEntity;
}

module.exports = ({ strapi }) => ({
  mintNFTJob: async job => {
    strapi.log.info('ENTER mintNFTJob');

    // Utils 🥇🤖
    // ----------------------------------------------------------------
    const nftMintOrderDb = strapi.db.query('api::nft-mint-order.nft-mint-order');

    _.get(job, "data.nftMintOrderEntity") = await nftMintOrderDb.findOne({
      where: {
        id: _.get(job, "data.nftMintOrderEntity.id")
      }
    });

    // ----------------------------------------------------------------
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
    // Utils 🥇🤖
    // ................................................................

    // Filter
    // ----------------------------------------------------------------
    // ----------------------------------------------------------------

    if (_.isEmpty(_.get(job, "data.nftMintOrderEntity"))) {
      return throwError(`Error while getting mint order entity for ${_.get(job, "data.nftMintOrderEntity.id")}`);
    }

    if (_.get(job, "data.nftMintOrderEntity.status") === "minted") {
      // log and return
      strapi.log.info(`mintNFTJob: minted already for ${_.get(job, "data.nftMintOrderEntity.id")}`);
      return _.get(job, "data.nftMintOrderEntity")
    }

    // if is job first attempts
    const PackageOrderController = strapi.controller('api::package-order.package-order');
    let decLastPackageOrder = await PackageOrderController.getLastPackageOrderDB(strapi, userId, 'DECREASE')
    if (_.get(job, "attemptsMade") <= 1) {
      // 🤑🤑🤑 reduce one package-order payment
      if (_.isEmpty(decLastPackageOrder)) {
        return ctx.PaymentRequired('You have no remaining balance to mint, please purchase more packages mints');
      }
      // update package-order payment
      packageOrderPayment = await PackageOrderController.reduceRemainMints(strapi, userId);
      //  add to job
      job.data.packageOrderPayment = packageOrderPayment;
    } else {
      job.data.packageOrderPayment = decLastPackageOrder;
    }
    // Filter
    // ................................................................


    // 👨‍🏭⛑ Create Progress
    // ----------------------------------------------------------------
    // ----------------------------------------------------------------

    const nftContractEntity = await getOrCreateContractAddress(strapi, job);
    job.data.nftContractEntity = nftContractEntity;
    const coverVideoIPFS = await getIpfsCoverAndVideo(strapi, job);
    const nftMetadata = await getTiktokMetadata(coverVideoIPFS, strapi, job);
    // upload metadata to IPFS
    const nftMetadataUrl = await uploadTiktokMetadataToIPFS(nftMetadata, strapi, job);

    // save data to show on strapi
    await updateNftMintOrderMetadata(nftMetadata, nftMetadataUrl, strapi, job);

    // mint NFT
    const mintOrderEntity = await mintTiktokNFT(nftMetadataUrl, strapi, job);

    // Create Progress
    // ................................................................

    return mintOrderEntity
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
      await PackageOrderController.increaseRemainMints(strapi, userId);
    }

    sendJobToClient(job, strapi, "mintNFTJobFailed", failedReason);
  }
});

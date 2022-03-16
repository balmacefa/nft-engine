'use strict';

const _ = require('lodash');

const {
  sendJobToClient,
  updateNftMintOrderMetadata,
  handleLastAttemptFailed,
  job_prop_check_update
} = require('./Utils/UtilsEngineController.js');

const {
  addJobExtraFunc,
  getSaveCurrentNftMintOrderEntity,
  jobFilter
} = require('./Utils/UtilsJob.js');

const { getOrCreateContractAddress } = require('./contract-address-step.js');
const { getIpfsCoverAndVideo } = require('./ipfs-cover-video-step.js');

const {
  getTiktokMetadata,
  uploadTiktokMetadataToIPFS
} = require('./build-metadata-step.js');

const { mintTiktokNFT } = require('./mint-nft-step.js');

const DATA_MINT_ORDER_ENTITY_ID = "data.nftMintOrderEntity.id";
// const ORDERS = require('./../../../../api/nft-mint-order/controllers/nft-mint-order');

module.exports = ({ strapi }) => ({
  mintNFTJob: async job => {
    strapi.log.info('ENTER mintNFTJob');

    // ----------------------------------------------------------------
    // Utils 🥇🤖 - add extra function to job object for later use
    // ----------------------------------------------------------------
    addJobExtraFunc(job);
    getSaveCurrentNftMintOrderEntity(strapi, job);

    // ----------------------------------------------------------------
    // ................................................................
    // Utils 🥇🤖
    // ................................................................
    // ----------------------------------------------------------------
    // Filter check if the job is valid to run or not 🤖 🤖 🤖
    // ----------------------------------------------------------------
    await jobFilter(job);
    // ................................................................
    // Filter
    // ................................................................


    // ----------------------------------------------------------------
    // 👨‍🏭⛑ Create Progress - 
    // ----------------------------------------------------------------

    let nftContractEntity = await job_prop_check_update(job, "nftContractEntity",
      async () => await getOrCreateContractAddress(strapi, job)
    );

    let coverVideoIPFS = await job_prop_check_update(job, "coverVideoIPFS",
      async () => await getIpfsCoverAndVideo(strapi, job)
    );

    let nftMetadata = await job_prop_check_update(job, "nftMetadata",
      async () => await getTiktokMetadata(coverVideoIPFS, strapi, job)
    );

    let nftMetadataUrl = await job_prop_check_update(job, "nftMetadataUrl",
      async () => await uploadTiktokMetadataToIPFS(nftMetadata, strapi, job)
    );

    let nftMintOrderEntity = await job_prop_check_update(job, "nftMintOrderEntity",
      async () => await updateNftMintOrderMetadata(nftMetadata, nftMintOrderEntity, strapi, job)
    );

    nftMintOrderEntity = await job_prop_check_update(job, "mintOrderEntity",
      async () => await mintTiktokNFT(nftMetadataUrl, strapi, job)
    );

    // ................................................................
    // Create Progress
    // ................................................................

    return nftMintOrderEntity;
  },
  mintNFTJobCompleted: async (job, returnValue, io) => {
    sendJobToClient(job, strapi, "mintNFTJobCompleted", returnValue, io)
  },
  mintNFTJobProgress: async (job, progress, io) => {
    sendJobToClient(job, strapi, "mintNFTJobProgress", progress, io)
  },
  mintNFTJobFailed: async (job, failedReason, io) => {
    // check if is last attempt and increase order-packages mints
    if (_.get(job, "attemptsMade") >= _.get(job, "opts.attempts")) {
      await handleLastAttemptFailed(_.get(job, DATA_MINT_ORDER_ENTITY_ID), strapi);
    }

    sendJobToClient(job, strapi, "mintNFTJobFailed", failedReason, io);
  },
  workerError: async (jobId, err, io) => {
    await handleLastAttemptFailed(jobId, strapi);
    // sendJobToClient(job, strapi, "workerError", io);
  }

});

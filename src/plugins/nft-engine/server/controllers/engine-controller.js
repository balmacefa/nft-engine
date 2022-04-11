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
  jobFilter,
  getJobId
} = require('./Utils/UtilsJob.js');

const { getOrCreateNFTContractAddress } = require('./contract-address-step.js');
const { uploadJobDataIpfsFiles, uploadNftMetadataToIPFS } = require('./upload-ipfs-files-step.js');

const {
  buildNftMetadata
} = require('./build-metadata-step.js');

const { mintNFT } = require('./mint-nft-step.js');
const { createNewOrderJob } = require('./Utils/UtilsNFTOrder.js');

// const ORDERS = require('./../../../../api/nft-mint-order/controllers/nft-mint-order');

module.exports = ({ strapi }) => ({
  createJob: async ctx => createNewOrderJob(strapi, ctx),
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

    job.pushProgress({ topic: 'INIT', msg: 'NFT Job Started' });
    let nftContractAddress = await job_prop_check_update(job, "nftContractAddress",
      async () => await getOrCreateNFTContractAddress(strapi, job)
    );

    let uploadIpfsFiles = await job_prop_check_update(job, "uploadIpfsFiles",
      async () => await uploadJobDataIpfsFiles(strapi, job)
    );

    // Metadata
    let nftMetadata = await job_prop_check_update(job, "nftMetadata",
      async () => await buildNftMetadata(uploadIpfsFiles, strapi, job)
    );

    let nftMetadataUrl = await job_prop_check_update(job, "nftMetadataUrl",
      async () => await uploadNftMetadataToIPFS(nftMetadata, strapi, job)
    );
    let nftMintOrderEntity = await updateNftMintOrderMetadata(nftMetadata, nftMetadataUrl, strapi, job);
    // merge nftMintOrderEntity to job
    // Metadata
    nftMintOrderEntity = await mintNFT(nftMetadataUrl, nftMintOrderEntity, nftContractAddress, strapi, job);

    // ................................................................
    // Create Progress
    // ................................................................

    return nftMintOrderEntity;
  },
  mintNFTJobCompleted: async (job, returnValue, io) => {
    sendJobToClient(job, strapi, "mintNFTJobCompleted", returnValue, io);
  },
  mintNFTJobProgress: async (job, progress, io) => {
    sendJobToClient(job, strapi, "mintNFTJobProgress", progress, io);
  },
  mintNFTJobFailed: async (job, failedReason, io) => {
    // check if is last attempt and increase order-packages mints
    if (_.get(job, "attemptsMade") >= _.get(job, "opts.attempts")) {
      await handleLastAttemptFailed(getJobId(job), strapi);
    }

    sendJobToClient(job, strapi, "mintNFTJobFailed", failedReason, io);
  },
  workerError: async (jobId, err, io) => {
    await handleLastAttemptFailed(jobId, strapi);
    // sendJobToClient(job, strapi, "workerError", io);
  }

});

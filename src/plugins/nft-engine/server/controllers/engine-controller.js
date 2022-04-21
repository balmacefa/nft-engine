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

    // Throw generic error for testing purpose
    throw new Error('Generic Error');


    let nftMetadataUrl = await job_prop_check_update(job, "nftMetadataUrl",
      async () => await uploadNftMetadataToIPFS(nftMetadata, strapi, job)
    );

    // At this point we have all the data we need to mint the NFT
    // and uploadIpfsFiles is no longer needed, so we can remove it
    let nftMintOrderEntity = await updateNftMintOrderMetadata(nftMetadata, nftMetadataUrl, strapi, job);
    // merge nftMintOrderEntity to job
    // Metadata
    nftMintOrderEntity = await mintNFT(nftMetadataUrl, nftMintOrderEntity, nftContractAddress, strapi, job);

    // ................................................................
    // Create Progress
    // ................................................................
    delete nftMintOrderEntity.uploadIpfsFiles;
    return nftMintOrderEntity;
  },
  mintNFTJobCompleted: async (job, returnValue, io) => {
    sendJobToClient(job, strapi, "completed", returnValue);
  },
  mintNFTJobProgress: async (job, progress, io) => {
    sendJobToClient(job, strapi, "progress", progress);
  },
  mintNFTJobFailed: async (job, failedReason, io) => {
    // check if is last attempt and increase order-packages mints
    if (_.get(job, "attemptsMade") >= _.get(job, "opts.attempts")) {
      failedReason.message = `Failed to mint NFT id ${job.id} :: after ${_.get(job, "attemptsMade")} attempts; see job.stacktrace logs for more details`;
      sendJobToClient(job, strapi, "unrecoverableFatalError", failedReason);
      return;
    }
    
    sendJobToClient(job, strapi, "failed", failedReason);
  },
  workerError: async (jobId, err, io) => {
    strapi.log.error(`WorkerError: ${jobId}`);
    strapi.log.error(JSON.stringify(err));
    // sendJobToClient(job, strapi, "workerError");
  }

});

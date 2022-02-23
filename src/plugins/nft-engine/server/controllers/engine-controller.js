'use strict';

const { getOrCreateContractAddress } = require('./contract-address-step.js');
const { getIpfsCoverAndVideo } = require('./ipfs-cover-video-step.js');
const { getTiktokMetadata, uploadTiktokMetadataToIPFS } = require('./build-metadata-step.js');
const { mintTiktokNFT } = require('./mint-nft-step.js');
const _ = require('lodash');

module.exports = ({ strapi }) => ({
  createJob: async ctx => {
    strapi.log.info('ENTER createJob');
    const queue = strapi
      .plugin('nft-engine')
      .bull.queue;

    const data = await queue.add('mint-nft', { color: 'pink' });

    strapi.log.info('EXIT createJob');
    return JSON.stringify(data);
  },
  mintNFTJob: async job => {
    strapi.log.info('ENTER mintNFTJob');
    // add pushProgress to prototype
    job.pushProgress = function (progress) {
      this.pushProgress(_.concat(this.progress || [], progress));
    };

    const nftContractEntity = await getOrCreateContractAddress(strapi, job);
    job.data.nftContractEntity = nftContractEntity;
    const coverAndVideoMeta = await getIpfsCoverAndVideo(strapi, job);
    const nftMetadata = await getTiktokMetadata(coverAndVideoMeta, strapi, job);
    // upload metadata to IPFS
    const nftMetadataUrl = await uploadTiktokMetadataToIPFS(nftMetadata, strapi, job);
    // mint NFT
    const nft = await mintTiktokNFT(nftMetadataUrl, strapi, job);


    // Do something with job
    return { address: nft.transactionId };
  },
  mintNFTJobCompleted: async (job, returnValue) => {
    strapi.log.info('ENTER mintNFTJobCompleted');
    strapi.log.debug(JSON.stringify(job));
    strapi.log.debug(JSON.stringify(returnValue));
    strapi.log.info('EXIT mintNFTJobCompleted');
  },
  mintNFTJobProgress: async (job, progress) => {
    strapi.log.info('ENTER mintNFTJobProgress');
    strapi.log.debug(JSON.stringify(job));
    strapi.log.debug(JSON.stringify(progress));
    strapi.log.info('EXIT mintNFTJobProgress');
  },
  mintNFTJobFailed: async (job, failedReason) => {
    strapi.log.info('ENTER mintNFTJobFailed');
    strapi.log.debug(JSON.stringify(job.attemptsMade));
    strapi.log.debug(JSON.stringify(failedReason));
    // strapi.log.info('EXIT mintNFTJobFailed');
  }
});

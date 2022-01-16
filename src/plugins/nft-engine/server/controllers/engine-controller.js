'use strict';

const { deployNFT, getNFTContractAddress, Currency, ipfsUpload } = require('@tatumio/tatum');
const Temp = require('temp');

const { getOrCreateContractAddress } = require('./contract-address-step.js');
const { getIpfsCoverAndVideo } = require('./ipfs-cover-video-step.js');
const { getTiktokMetadata, uploadTiktokMetadataToIPFS, mintTiktokNFT } = require('./build-metadata-step.js');

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
    const {
      nftMintOrderEntity,
      tikTokVideoMetadata
    } = job.data;

    // create temp folder
    const tempPath = Temp.mkdirSync(`temp_mint_order_entity_{${nftMintOrderEntity.id}}__`);
    job.data.tempPath = tempPath;

    const nftContractEntity = await getOrCreateContractAddress(nftMintOrderEntity, strapi, job);
    const coverAndVideoMeta = await getIpfsCoverAndVideo(strapi, job);
    const nftMetadata = await getTiktokMetadata(coverAndVideoMeta, strapi, job);
    // upload metadata to IPFS
    const nftMetadataUrl = await uploadTiktokMetadataToIPFS(nftMetadata, nftContractEntity, strapi, job);
    // mint NFT


    // Do something with job
    return 'some value';
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

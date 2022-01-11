'use strict';

const { deployNFT, getNFTContractAddress, Currency, ipfsUpload } = require('@tatumio/tatum');
const Temp = require('temp');
const { v4: uuidv4 } = require('uuid');


const { getOrCreateContractAddress } = require('./contract-address-step.js');
// require lodash
const _ = require('lodash');


const getIpfsFilesDic = async (strapi, job) => {
  const {
    nftMintOrderEntity,
    tikTokVideoMetadata,
    s_v_web_id,
    sid_ucp_v1,
    tempPath
  } = job.data;

  const uploadCover = () =>
    new Promise(async (resolve) => {
      job.updateProgress({ msg: 'Uploading cover image to IPFS' });
      const coverUrl = _.get(tikTokVideoMetadata, 'itemInfo.itemStruct.video.cover');
      const fetchCover = await axios.get(coverUrl, { responseType: 'arraybuffer' });
      resolve(
        await ipfsUpload(Buffer.from(fetchCover.data), `cover_${uuidv4()}.jpg`)
      );
      // response example:
      // {
      //   "ipfsHash": "bafybeihrumg5hfzqj6x47q63azflcpf6nkgcvhzzm6/test-356.jpg"
      // }
    });

  const uploadVideo = () =>
    new Promise(async (resolve) => {
      job.updateProgress({ msg: 'Uploading Tiktok video to IPFS' });
      const videoId = _.get(tikTokVideoMetadata, 'itemInfo.itemStruct.video.id');
      const axiosInstance = axios.create(strapi.config.get('server.tiktok_api_axios_config'));
      const fetchVideo = await axiosInstance.get(`/api/download_video/${videoId}`, { responseType: 'arraybuffer' });
      resolve(
        await ipfsUpload(Buffer.from(fetchVideo.data), `video_${uuidv4()}.mp4`)
      );
    });

  const ipfsResult = await Promise.allSettled([uploadCover(),uploadVideo()]);
  job.updateProgress({ msg: 'IPFS upload complete' });

}

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
      tikTokVideoMetadata,
      s_v_web_id,
      sid_ucp_v1
    } = job.data;

    // create temp folder
    const tempPath = Temp.mkdirSync(`temp_mint_order_entity_{${nftMintOrderEntity.id}}__`);
    job.data.tempPath = tempPath;

    const nftContractEntity = await getOrCreateContractAddress(nftMintOrderEntity, strapi, job);
    const ipfsFilesDic = await getIpfsFilesDic(strapi, job);

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

'use strict';

const { ipfsUpload } = require('@tatumio/tatum');
const { v4: uuidv4 } = require('uuid');
// axios
const axios = require('axios');

// require lodash
const _ = require('lodash');


const getIpfsCoverAndVideo = async (strapi, job) => {
    const {
        tikTokVideoMetadata,
        s_v_web_id,
        sid_ucp_v1
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
            const fetchVideo = await axiosInstance.get(`/api/download_video/${videoId}`,
                {
                    responseType: 'arraybuffer',
                    data: {
                        s_v_web_id,
                        sid_ucp_v1
                    }
                }
            );
            resolve(
                await ipfsUpload(Buffer.from(fetchVideo.data), `video_${uuidv4()}.mp4`)
            );
        });

    const ipfsResult = await Promise.allSettled([
        uploadCover(),
        uploadVideo()
    ]);
    // [
    //   {status: "fulfilled", value: {...}},
    //   {status: "rejected",  reason: Error: an error}
    // ]

    // if any of the uploads failed, then we throw an error
    const failedUploads = ipfsResult.filter(result => result.status === 'rejected');
    if (failedUploads.length > 0) {
        const error = failedUploads[0].reason;
        strapi.log.error(`Error while uploading to IPFS: \n ${JSON.stringify(error)}`);
        throw new Error(`Error while uploading to IPFS: \n ${JSON.stringify(error)}`);
    }
    job.updateProgress({ msg: 'IPFS upload complete' });

    return {
        "image": `ipfs://${failedUploads[0].value.ipfsHash}`, // cover
        "animation_url": `ipfs://${failedUploads[1].value.ipfsHash}`, // video
    }

}

module.exports = {
    getIpfsCoverAndVideo
};

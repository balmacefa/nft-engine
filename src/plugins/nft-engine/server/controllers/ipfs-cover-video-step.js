'use strict';

const pinataService = require('./services/pinataService');

// axios
const axios = require('axios');

// require lodash
const _ = require('lodash');
const fs = require('fs');
const Temp = require('temp');

const getIpfsCoverAndVideo = async (strapi, job) => {
    // return {
    //     "image": `ipfs://sdlafksdj`, // cover
    //     "animation_url": `ipfs://oifdpoasiudf`,
    // }

    const {
        tikTokVideoMetadata,
        videoId
    } = job.data;

    const { path: pathCover } = Temp.openSync({
        prefix: `criptok_cover_${videoId}`,
        suffix: `.jpg`
    });

    const { path: pathVideo } = Temp.openSync({
        prefix: `criptok_video_${videoId}`,
        suffix: `.mp4`
    });

    const uploadCover = () =>
        new Promise(async (resolve) => {
            job.pushProgress({ msg: 'IPFS media: Uploading cover image to IPFS' });
            const coverUrl = _.get(tikTokVideoMetadata, 'itemInfo.itemStruct.video.cover');
            const fetch = await axios.get(coverUrl, { responseType: 'stream' });
            // write data to path

            await fetch.data.pipe(fs.createWriteStream(pathCover));

            const ipfs = await pinataService.pinFileToIPFS(strapi, pathCover,
                {
                    coverUrl: coverUrl,
                    size: fs.statSync(path).size,
                    videoId: videoId,
                    
                });
            resolve(ipfs);
            // response example:
            // {
            //   "ipfsHash": "bafybeihrumg5hfzqj6x47q63azflcpf6nkgcvhzzm6/test-356.jpg"
            // }
        });

    const uploadVideo = () =>
        new Promise(async (resolve) => {
            job.pushProgress({ msg: 'IPFS media: Uploading Tiktok video to IPFS' });
            const axiosInstance = axios.create(strapi.config.get('server.tiktok_api_axios_config'));
            const fetch = await axiosInstance.get(`/api/download_video/${videoId}`,
                { responseType: 'stream' });
            await fetch.data.pipe(fs.createWriteStream(pathVideo));
            const ipfs = await pinataService.pinFileToIPFS(strapi, pathVideo);
            resolve(ipfs);
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
    job.pushProgress({ msg: 'IPFS media: Upload complete' });

    return {
        "image": `ipfs://${ipfsResult[0].value}`, // cover
        "animation_url": `ipfs://${ipfsResult[1].value}`, // video
    }

}

module.exports = {
    getIpfsCoverAndVideo
};

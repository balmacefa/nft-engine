'use strict';

const pinataService = require('./services/pinataService');

// axios
const axios = require('axios');

// require lodash
const _ = require('lodash');
const fs = require('fs');
const Temp = require('temp');
const Sleep = require('await-sleep');
const { promisify } = require('util');
const stream = require('stream');


// const { createFFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');
// const ffmpeg = createFFmpeg({ log: true });
// https://ffmpegwasm.netlify.app/#demo

const getIpfsCoverAndVideo = async (strapi, job) => {
    // return {
    //     "image": `ipfs://sdlafksdj`, // cover
    //     "animation_url": `ipfs://oifdpoasiudf`,
    // }

    const {
        tikTokVideoMetadata,
        videoId,
        userId
    } = job.data;

    const { path: pathCover } = Temp.openSync({
        prefix: `cover_${videoId}`,
        suffix: `.jpg`
    });

    const { path: pathVideo } = Temp.openSync({
        prefix: `videos_${videoId}`,
        suffix: `.mp4`
    });

    const uploadCover = () =>
        new Promise(async (resolve) => {
            const coverUrl = _.get(tikTokVideoMetadata, 'itemInfo.itemStruct.video.cover');
            const fetch = await axios.get(coverUrl, { responseType: 'stream' });

            // write data to path asynchronously
            const finishedDownload = promisify(stream.finished);
            const writer = fs.createWriteStream(pathVideo);
            fetch.data.pipe(writer);
            await finishedDownload(writer);

            let response = undefined;
            let data = {
                Unpin: true,
                IpfsHash: undefined,
                PinSize: undefined,
            };

            // Wait max of 30 min for the transaction to be signed
            const initTime = Date.now();
            const maxTime = strapi.config.get('server.retryLoop.maxWaitTimeLoop');
            while (response === undefined && Date.now() - initTime < maxTime) {

                if (data.Unpin && data.IpfsHash) {
                    if (await pinataService.unPinIpfs(strapi, data.IpfsHash)) {
                        // removed from pinata, retry
                        // pus update
                        job.pushProgress({ msg: 'IPFS media: Cover: Removed from pinata, retry upload' });
                        data.Unpin = false;
                        data.IpfsHash = undefined;
                    } else {
                        // error
                        throw new Error("Error: IPFS media: Pinata error Uploading cover image");
                    }
                }

                // _________________________________________
                // _________________________________________
                job.pushProgress({ msg: 'IPFS media: Cover: Uploading image to IPFS' });
                data = await pinataService.pinFileToIPFS(strapi, pathCover,
                    {
                        name: `cover_${videoId}`,
                        keyvalues: {
                            coverUrl: coverUrl,
                            videoId: videoId,
                            userId
                        }
                    });
                // _________________________________________
                // _________________________________________

                if (data?.Unpin) {
                    await Sleep(strapi.config.get('server.retryLoop.sleepWaitTimeLoop'))
                } else if (data?.IpfsHash) {
                    job.pushProgress({ msg: 'IPFS media: Cover: Uploaded to IPFS' });
                    response = data.IpfsHash;
                }
            }

            if (response === undefined) {
                throw new Error("Error: Timeout: IPFS media: failed to upload cover image");
            }
            resolve(response);

        });

    const uploadVideo = () =>
        new Promise(async (resolve) => {
            const axiosInstance = axios.create(strapi.config.get('server.tiktok_api_axios_config'));
            const fetch = await axiosInstance.get(`/api/download_video/${videoId}`,
                { responseType: 'stream' });

            // write data to path asynchronously
            const finishedDownload = promisify(stream.finished);
            const writer = fs.createWriteStream(pathVideo);
            fetch.data.pipe(writer);
            await finishedDownload(writer);

            // const pathWebm = pathVideo.replace('.mp4', '.webm');

            // // ffmpeg convert mp4 to webm and save
            // // (async () => {
            // await ffmpeg.load();
            // ffmpeg.FS('writeFile', pathVideo, await fetchFile(pathVideo));

            // await ffmpeg.run('-i', pathVideo, pathWebm);
            // await fs.promises.writeFile(pathWebm, ffmpeg.FS('readFile', pathWebm));


            let response = undefined;
            let data = {
                Unpin: true,
                IpfsHash: undefined,
                PinSize: undefined,
            };

            // Wait max of 30 min for the transaction to be signed
            const initTime = Date.now();
            const maxTime = strapi.config.get('server.retryLoop.maxWaitTimeLoop');
            while (response === undefined && Date.now() - initTime < maxTime) {
                if (data?.Unpin && data?.IpfsHash) {
                    if (await pinataService.unPinIpfs(strapi, data.IpfsHash)) {
                        // removed from pinata, retry
                        // pus update
                        job.pushProgress({ msg: 'IPFS media: TitTok Video: Removed from pinata, retry upload' });
                        data.Unpin = false;
                        data.IpfsHash = undefined;
                    } else {
                        // error
                        throw new Error("Error: IPFS media: Pinata error Uploading video");
                    }
                }

                // _________________________________________
                // _________________________________________
                job.pushProgress({ msg: 'IPFS media: TitTok Video: Uploading to IPFS' });
                data = await pinataService.pinFileToIPFS(strapi, pathVideo,
                    {
                        name: `video_${videoId}`,
                        keyvalues: {
                            videoId: videoId,
                            userId
                        }
                    });

                // _________________________________________
                // _________________________________________

                if (data?.Unpin) {
                    await Sleep(strapi.config.get('server.retryLoop.sleepWaitTimeLoop'))
                } else if (data?.IpfsHash) {
                    job.pushProgress({ msg: 'IPFS media: Cover: Uploaded to IPFS' });
                    response = data.IpfsHash;
                }
            }

            if (response === undefined) {
                throw new Error("Error: Timeout: IPFS media: failed to upload video");
            }

            resolve(response);

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

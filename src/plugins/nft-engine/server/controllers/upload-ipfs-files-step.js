'use strict';

const pinataService = require('./services/pinataService');

const _ = require('lodash');
const Sleep = require('await-sleep');


const uploadFile = (fileData, strapi, job) =>
  new Promise(async (resolve) => {

    // {
    //    base64data: 'datadas',
    //    setMetadataPath: 'image_url'
    // }

    const nftMintOrderEntityId = job?.data?.nftMintOrderEntity?.id;

    let response;

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
          job.pushProgress({ topic: 'IPFS', msg: `Hash: ${data.IpfsHash} Unpinned from pinata, retry upload` });
          data.Unpin = false;
          data.IpfsHash = undefined;
        } else {
          // error
          throw new Error(`IPFS media: Pinata error Uploading file`);
        }
      }

      // _________________________________________
      // _________________________________________
      job.pushProgress({ topic: 'IPFS', msg: `Uploading to IPFS` });
      data = await pinataService.pinBase64ToIPFS(strapi, fileData.base64data,
        {
          keyvalues: {
            jobId: job.id,
            nftMintOrderEntityId
          },
          ...fileData?.pinataMetaData,
        });
      // _________________________________________
      // _________________________________________
      if (data?.Unpin) {
        await Sleep(strapi.config.get('server.retryLoop.sleepWaitTimeLoop'));
      } else if (data?.IpfsHash) {
        job.pushProgress({ topic: 'IPFS', msg: `Hash: ${data.IpfsHash} Uploaded to IPFS` });
        fileData.ipfs = `ipfs://${data.IpfsHash}`;
        response = fileData;
      }
    }
    if (response === undefined) {
      job.pushProgress({ topic: 'IPFS', msg: `Error: Timeout: IPFS media: failed to upload file` });
      throw new Error("Error: Timeout: IPFS media: failed to upload cover image");
    }
    resolve(response);
  });

const uploadJobDataIpfsFiles = async (strapi, job) => {
  // Koa ctx.request.files
  const uploadIpfsList = job.data.nftMintOrderEntity.uploadIpfsFiles;
  //   [{
  //   base64data,
  //   setMetadataPath
  // }]

  // loop over files
  const uploadIpfs = uploadIpfsList.map((fileData) => uploadFile(fileData, strapi, job));
  const ipfsResult = await Promise.allSettled(uploadIpfs);

  // [
  //   {status: "fulfilled", value: {...}},
  //   {status: "rejected",  reason: Error: an error}
  // ]

  // if any of the uploads failed, then we throw an error
  const failedUploads = ipfsResult.filter(result => result.status === 'rejected');
  if (failedUploads.length > 0) {
    const error = failedUploads[0].reason;
    strapi.log.error(`Error while uploading to IPFS: \n ${JSON.stringify(error)}`);
    job.pushProgress({ topic: 'IPFS', msg: `Error while uploading to IPFS: \n ${JSON.stringify(error)}` });
    throw new Error(`Error while uploading to IPFS: \n ${JSON.stringify(error)}`);
  }
  job.pushProgress({ topic: 'IPFS', msg: `IPFS: Uploaded to IPFS` });

  // Convert ipfsResult [{status: "fulfilled", value: {...}},{status: "fulfilled", value: {...}}]
  // to ipfsResult [{...},{...}]
  const ipfsResultList = ipfsResult.map(result => result.value);

  return ipfsResultList;
};

const uploadNftMetadataToIPFS = async (nftMetadata, strapi, job) => {
  job.pushProgress({ msg: 'NFT metadata: Uploading metadata to IPFS' });

  // convert nftMetadata json to base64
  const nftMetadataBase64 = Buffer.from(JSON.stringify(nftMetadata)).toString('base64');

  const result = await uploadFile({
    base64data: nftMetadataBase64
  }, strapi, job);

  return result.ipfs;
};

module.exports = {
  uploadJobDataIpfsFiles,
  uploadFile,
  uploadNftMetadataToIPFS
};

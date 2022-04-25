'use strict';

// require lodash
const _ = require('lodash');

const buildNftMetadata = async (uploadIpfsFiles, strapi, job) => {
  // uploadIpfsFiles =
  //   [{
  //   base64data,
  //   setMetadataPath,
  //   ipfs
  // }]
  job.pushProgress({ msg: 'NFT metadata: Building' });

  let nftMetadata = _.get(job.data, 'nftMintOrderEntity.nftMetadata', {});

  // loop through uploadIpfsFiles
  // and set the metadata
  //  _.set(nftMetadata, uploadIpfsFilesItem.setMetadataPath, uploadIpfsFilesItem.ipfs);
  if (!_.isEmpty(uploadIpfsFiles)) {

    for (let fileData of uploadIpfsFiles) {
      _.set(nftMetadata, fileData.setMetadataPath, fileData.ipfs);
    }
  }

  job.pushProgress({ msg: 'NFT metadata: Built' });
  return nftMetadata;
};

module.exports = {
  buildNftMetadata
};

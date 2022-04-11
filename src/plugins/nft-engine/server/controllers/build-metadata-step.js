'use strict';

// require lodash
const _ = require('lodash');
const Temp = require('temp');
const fs = require('fs');
const pinataService = require('./services/pinataService');

const buildNftMetadata = async (uploadIpfsFiles, strapi, job) => {
  // uploadIpfsFiles = [{
  //   filepath: '',
  //   setMetadataPath: '_.set(nftMetadata, this.setMetadataPath, this.ipfs);',
  //   pinataMetaData: '',
  //   ipfs: '',
  // }]
  job.pushProgress({ msg: 'NFT metadata: Building' });

  let nftMetadata = job.data.nftMetadata;

  // loop through uploadIpfsFiles
  // and set the metadata
  //  _.set(nftMetadata, uploadIpfsFilesItem.setMetadataPath, uploadIpfsFilesItem.ipfs);
  for (let fileData of uploadIpfsFiles) {
    _.set(nftMetadata, fileData.setMetadataPath, fileData.ipfs);
  }

  job.pushProgress({ msg: 'NFT metadata: Built' });
  return nftMetadata;
};

module.exports = {
  buildNftMetadata
};

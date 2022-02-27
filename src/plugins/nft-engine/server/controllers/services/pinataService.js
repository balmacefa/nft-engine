'use strict';
const { getAxiosInstance } = require('./baseService');

const pinataAxiosInstance = (strapi) => getAxiosInstance(strapi, strapi.config.get('server.pinata_axios_instance'));
const fs = require('fs');

module.exports = {
  pinFileToIPFS: async (strapi, path, metadata) => {
    // .pinFromFS(path);
    const { data } = await pinataAxiosInstance(strapi).post(
      '/pinFileToIPFS',
      {
        file: fs.createReadStream(path),
        pinataMetadata: {
          ...metadata,
          timestamp: Math.round(new Date().getTime() / 1000),
        }
      }
    );
    //   {
    //     IpfsHash: This is the IPFS multi-hash provided back for your content,
    //     PinSize: This is how large (in bytes) the content you just pinned is,
    //     Timestamp: This is the timestamp for your content pinning (represented in ISO 8601 format)
    // }
    // data.length is the length of the file in bytes
    if (data.pinSize !== fs.statSync(path).size) {
      // if path file length is not equal to data.length, then something went wrong
      return undefined;
    }
    return data.IpfsHash;
  },
  unPinIpfs: async (strapi, ipfsHash) => {
    const { data, status } = await pinataAxiosInstance(strapi).delete(
      `/unpin/${ipfsHash}`
    );

    if (status !== 200) {
      return undefined;
    }

    return data;
  }

};

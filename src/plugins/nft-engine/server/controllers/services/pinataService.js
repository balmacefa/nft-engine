'use strict';
const { getAxiosInstance } = require('./baseService');

const fs = require('fs');

const FormData = require('form-data');

// const range = [[100, 199], [429, 429], [500, 599]]
const inRange = (num, range) => {
  // nun string to integer
  num = parseInt(num);
  // is number in arrayRange
  for (let i = 0; i < range.length; i++) {
    if (num >= range[i][0] && num < range[i][1]) {
      return true;
    }
  }
  return false;
}


module.exports = {
  pinFileToIPFS: async (strapi, path, metadata) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(path));
    form.append('pinataMetadata', JSON.stringify(metadata));

    const formHeaders = form.getHeaders();
    // .pinFromFS(path);
    const { data } = await getAxiosInstance(strapi.config.get('server.pinata_axios_instance'), {
      requestInterceptorError: (error) => {
        // Any status codes that falls outside the range of 2xx cause this function to trigger
        return {
          Unpin: true,
          IpfsHash: undefined,
          PinSize: undefined,
        };
      }
    }).post('/pinFileToIPFS', form,
      {
        headers: formHeaders
      }
    );
    //   {
    //     IpfsHash: This is the IPFS multi-hash provided back for your content,
    //     PinSize: This is how large (in bytes) the content you just pinned is,
    //     Timestamp: This is the timestamp for your content pinning (represented in ISO 8601 format)
    // }

    // round to kilobyte (originalFileSize / 1000)
    // round to 1 digit
    // data.length is the length of the file in bytes
    const pinSize = Math.round(data?.PinSize / 100);
    const fileSize = Math.round(fs.statSync(path).size / 100);
    if (data?.IpfsHash && pinSize < fileSize) {
      // if path file length is not equal to data.length, then something went wrong
      data.Unpin = true;
    }
    return data;
  },
  unPinIpfs: async (strapi, ipfsHash) => {
    const { status } = await getAxiosInstance(strapi.config.get('server.pinata_axios_instance'), {
      requestInterceptorError: (error) => {
        // Any status codes that falls outside the range of 2xx cause this function to trigger
        return false;
      }
    })
      .delete(
        `/unpin/${ipfsHash}`
      );

    if (status !== 200) {
      return undefined;
    }

    return true;
  }

};

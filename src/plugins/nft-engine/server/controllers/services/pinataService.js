'use strict';
const { getAxiosInstance } = require('./baseService');

const fs = require('fs');

const FormData = require('form-data');
const Temp = require('temp');


const pinFormDataToIPFS = async (strapi, form, originalFileSize) => {

  const formHeaders = form.getHeaders();
  // .pinFromFS(path);
  const response = await getAxiosInstance(strapi.config.get('server.pinata_axios_instance'), {
    requestInterceptorError: (error) => {
      // Any status codes that falls outside the range of 2xx cause this function to trigger
      strapi.log.error(error);

      if (error.response?.status === 400) {
        // 400 Bad Request - The request was unacceptable, often due to base64 encoding
        throw new Error(`IPFS media: Pinata error Uploading file 400 Bad Request base64 encoding`);
      }
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
  const data = response?.data;
  //   {
  //     IpfsHash: This is the IPFS multi-hash provided back for your content,
  //     PinSize: This is how large (in bytes) the content you just pinned is,
  //     Timestamp: This is the timestamp for your content pinning (represented in ISO 8601 format)
  // }

  // round to kilobyte (originalFileSize / 100)
  // round to 1 digit
  // data.length is the length of the file in bytes
  const pinSize = Math.round(data?.PinSize / 100);
  // The size of the file in bytes.
  const fileSize = Math.round(originalFileSize / 100);
  if (data?.IpfsHash && pinSize < fileSize) {
    // if path file length is not equal to data.length, then something went wrong
    data.Unpin = true;
  }
  return data;
};

const pinFileToIPFS = async (strapi, path, metadata) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(path));
  form.append('pinataMetadata', JSON.stringify(metadata));

  // The size of the file in bytes.
  const originalFileSize = fs.statSync(path).size;

  return await pinFormDataToIPFS(strapi, form, originalFileSize);
};

module.exports = {
  pinBase64ToIPFS: async (strapi, base64, metadata) => {
    const form = new FormData();

    const { path } = Temp.openSync({
      prefix: 'pinata_upload_',
    });

    const base64Buffer = Buffer.from(base64, "base64");
    // save base64 data into a temporary file
    fs.writeFileSync(path, base64Buffer);

    form.append('file', fs.createReadStream(path));
    form.append('pinataMetadata', JSON.stringify(metadata));

    // The size of the file in bytes.
    const originalFileSize = Buffer.byteLength(base64Buffer);

    return await pinFormDataToIPFS(strapi, form, originalFileSize);

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

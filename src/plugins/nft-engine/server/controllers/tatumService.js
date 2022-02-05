'use strict';
const axios = require('axios');
// const { ipfsUpload } = require('@tatumio/tatum');
const pinataSDK = require('@pinata/sdk');

// http
const http = require('http');
const https = require('https');
const axiosRetry = require('axios-retry');
const { isNetworkOrIdempotentRequestError } = require('axios-retry');

// generate Axios
const getAxiosInstance = (strapi) => {
  const instance = axios.create(
    {
      ...strapi.config.get('server.tatum_api_axios_config'),
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true })
    }
  );
  // In case of 429 Too Many Requests response error, request is triggered again
  axiosRetry(instance, {
    retryDelay: () => strapi.config.get('server.tatum.retryDelay'),
    retries: strapi.config.get('server.tatum.retries'),
    retryCondition: (error) => isNetworkOrIdempotentRequestError(error) || error?.response?.status === 429
  });
  return instance;
}


module.exports = {
  uploadIpfs: async (strapi, path) => {
    const key = strapi.config.get('server.pinata.apiKey');
    const secret = strapi.config.get('server.pinata.secret');

    const response = await pinataSDK(key, secret)
      .pinFromFS(path);

    return response.IpfsHash;
  },

  mintNFTWithUri: async (strapi, body) => {
    const { data } = await getAxiosInstance(strapi).post('/v3/nft/mint', body);
    return data;
  },
  deployNFT: async (strapi, body) => {
    const { data } = await getAxiosInstance(strapi).post('/v3/nft/deploy', body);
    return data;
  },
  getNFTContractAddress: async (strapi, txId) => {
    const { data } = await getAxiosInstance(strapi).get(`/v3/blockchain/sc/address/MATIC/${txId}`);
    return data;
  },
  getTransactionDetailFromSignature: async (strapi, signatureId) => {
    const { data } = await getAxiosInstance(strapi).get(`/v3/kms/${signatureId}`);
    return data;
  }
};
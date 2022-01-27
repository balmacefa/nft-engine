'use strict';
const axios = require('axios');
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
  uploadInterPlanetaryData: async (strapi, {data, type}) => {
    const buffer = Buffer.from(data);
    // convert to blob
    const blob = new Blob([buffer], { type: type });
    const formData = new FormData();
    formData.append('file', blob);

    const response = await getAxiosInstance(strapi)
      .post('/v3/ipfs', bodyFormData);
    return response.data;
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

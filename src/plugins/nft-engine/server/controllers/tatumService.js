'use strict';
const axios = require('axios');
// http
const http = require('http');
const https = require('https');
const axiosRetry, { isNetworkOrIdempotentRequestError } = require('axios-retry');

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
  deployNFT: async (strapi, body) => {
    const axiosInstance = getAxiosInstance(strapi);
    return await axiosInstance.post('/v3/nft/deploy', body);
  },
  getNFTContractAddress: async (strapi, txId) => {
    const axiosInstance = getAxiosInstance(strapi);
    return await axiosInstance.get(`/v3/blockchain/sc/address/MATIC/${txId}`);
  }
};

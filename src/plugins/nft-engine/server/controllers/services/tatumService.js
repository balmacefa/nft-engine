'use strict';
const { getAxiosInstance } = require('./baseService');
const tatumAxiosInstance = (strapi) => getAxiosInstance(strapi, strapi.config.get('server.tatum_axios_instance'));

module.exports = {
  mintNFTWithUri: async (strapi, body) => {
    const { data } = await tatumAxiosInstance(strapi).post('/v3/nft/mint', body);
    return data;
  },
  deployNFT: async (strapi, body) => {
    const { data } = await tatumAxiosInstance(strapi).post('/v3/nft/deploy', body);
    return data;
  },
  getNFTContractAddress: async (strapi, txId) => {
    const { data } = await tatumAxiosInstance(strapi).get(`/v3/blockchain/sc/address/MATIC/${txId}`);
    return data;
  },
  getTransactionDetailFromSignature: async (strapi, signatureId) => {
    const { data } = await tatumAxiosInstance(strapi).get(`/v3/kms/${signatureId}`);
    return data;
  }
};

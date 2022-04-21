'use strict';
const { getAxiosInstance } = require('./baseService');

module.exports = {
  getTatumSignerId: (strapi, job) => {
    const {
      tatum_use_test_net,
      nftMintOrderEntity: {
        blockchain
      }
    } = job.data;

    const query = `server.tatum.blockchains.${tatum_use_test_net ? 'testnet' : 'mainnet'}.${blockchain}.signatureId`;
    return strapi.config.get(query);
  },
  mintNFTWithUri: async (strapi, body) => {
    const tatumAxiosInstance = (strapi) => getAxiosInstance(strapi.config.get('server.tatum_axios_instance'));
    const response = await tatumAxiosInstance(strapi).post('/v3/nft/mint', body);
    return response.data;
  },
  deployNFT: async (strapi, body) => {
    const tatumAxiosInstance = (strapi) => getAxiosInstance(strapi.config.get('server.tatum_axios_instance'));
    const { data } = await tatumAxiosInstance(strapi).post('/v3/nft/deploy', body);
    return data;
  },
  getNFTContractAddress: async (strapi, blockchain, txId) => {
    const tatumAxiosInstance = (strapi) => getAxiosInstance(strapi.config.get('server.tatum_axios_instance'));
    const { data } = await tatumAxiosInstance(strapi).get(`/v3/blockchain/sc/address/${blockchain}/${txId}`);
    return data;
  },
  getTransactionDetailFromSignature: async (strapi, signatureId) => {
    const tatumAxiosInstance = (strapi) => getAxiosInstance(strapi.config.get('server.tatum_axios_instance'));
    const { data } = await tatumAxiosInstance(strapi).get(`/v3/kms/${signatureId}`);
    return data;
  }
};

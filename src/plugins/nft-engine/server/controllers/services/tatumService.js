'use strict';
const { getAxiosInstance } = require('./baseService');

const getKeyStrapiTatumAxios = (strapi, job) => {
  const {
    tatum_use_test_net
  } = job.data;
  const q = `server.tatum_axios_instance.${tatum_use_test_net ? 'testnet' : 'mainnet'}`;
  return strapi.config.get(q);
};

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
  mintNFTWithUri: async (strapi, body, job) => {
    const tatumAxiosInstance = (strapi) => getAxiosInstance(getKeyStrapiTatumAxios(strapi, job));
    const response = await tatumAxiosInstance(strapi).post('/v3/nft/mint', body);
    return response.data;
  },
  deployNFT: async (strapi, body, job) => {
    const tatumAxiosInstance = (strapi) => getAxiosInstance(getKeyStrapiTatumAxios(strapi, job));
    const { data } = await tatumAxiosInstance(strapi).post('/v3/nft/deploy', body);
    return data;
  },
  getNFTContractAddress: async (strapi, job, blockchain, txId) => {
    const tatumAxiosInstance = (strapi) => getAxiosInstance(getKeyStrapiTatumAxios(strapi, job));
    const { data } = await tatumAxiosInstance(strapi).get(`/v3/blockchain/sc/address/${blockchain}/${txId}`);
    return data;
  },
  getTransactionDetailFromSignature: async (strapi, job, signatureId) => {
    const tatumAxiosInstance = (strapi) => getAxiosInstance(getKeyStrapiTatumAxios(strapi, job));
    const { data } = await tatumAxiosInstance(strapi).get(`/v3/kms/${signatureId}`);
    return data;
  }
};

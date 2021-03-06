'use strict';

// const { deployNFT, getNFTContractAddress, Currency } = require('@tatumio/tatum');
const tatumService = require('./services/tatumService');

// require lodash
const _ = require('lodash');

const Sleep = require('await-sleep');

const getOrCreateNFTContractAddress = async (strapi, job) => {

  const {
    user,
    blockchain,
    collectionName,// Search by name
    symbol
    // transactionId: null, This Identify the tatum queue order id
    // contractAddress:null, This the blockchain contract address resolved
  } = job.data.nftMintOrderEntity; // this is return as a success job result for update the job
  // const name = `CRIPTOK__${userId}`;
  // const symbol = `CRIPTOK`;

  const nftContractService = strapi.service('api::nft-contract.nft-contract');

  // This needs to change per blockchain --- NOT MATIC ONLY
  const tatumSignerId = tatumService.getTatumSignerId(strapi, job);

  const tatum_use_test_net = _.get(job, 'data.tatum_use_test_net', true);

  let contractEntity = await nftContractService.findContractEntity({
    user,
    blockchain,
    collectionName,
    symbol,
    useTestNet: tatum_use_test_net
  });

  if (!contractEntity) {
    contractEntity = await nftContractService.create(
      {
        data: {
          user,
          blockchain,
          collectionName,
          symbol,
          useTestNet: tatum_use_test_net
          // transactionId: null, This Identify the tatum queue order id
          // contractAddress:null, This the blockchain contract address resolved
        }
      }
    );
    // decrease the user contract claim balance
    await strapi.service('api::contract-claim.contract-claim').decreaseContractClaim(user, blockchain, tatum_use_test_net);
  }


  if (!contractEntity.signatureId) {
    job.pushProgress({ topic: 'NFT_COLLECTION_CONTRACT', msg: 'NFT contract: Not contract found!' });

    // call Tatum
    // Because Polygon is an Ethereum-compatible blockchain, this means that any token or wallet address you have on Ethereum is also interchangeable with Polygon. You can use the exact same wallet address to interact between your regular ERC20 tokens on Ethereum and with Polygon using the Matic bridge.
    const response = await tatumService.deployNFT(strapi,
      {
        name: collectionName,
        chain: blockchain,
        symbol,
        provenance: true,
        publicMint: false, // This is IMPORTANT to set to false; Only the privateKey can mint
        signatureId: tatumSignerId,
      }, job);

    if (response.failed) {
      strapi.log.error("Creation of contract failed: \n" + JSON.stringify(response));
      // Throw error
      throw new Error("Creation of contract failed: \n" + JSON.stringify(response));
    }

    // Update contract entity with transaction.signatureId
    contractEntity = await nftContractService.updateContractEntity(
      contractEntity.id,
      {
        signatureId: response.signatureId
      }
    );

    job.pushProgress({ topic: 'NFT_COLLECTION_CONTRACT', msg: 'NFT contract: new Contract queued' });
  }

  if (!contractEntity.transactionId) {
    // to be sure the contract is being signed:
    let txId;
    const initTime = Date.now();
    // Wait max of 30 min for the transaction to be signed
    const maxTime = strapi.config.get('server.retryLoop.maxWaitTimeLoop');
    while (txId === undefined && Date.now() - initTime < maxTime) {
      job.pushProgress({ topic: 'NFT_COLLECTION_CONTRACT', msg: `NFT contract: Waiting for blockchain signup and confirmation` });
      // call Tatum
      // Because Polygon is an Ethereum-compatible blockchain, this means that any token or wallet address you have on Ethereum is also interchangeable with Polygon. You can use the exact same wallet address to interact between your regular ERC20 tokens on Ethereum and with Polygon using the Matic bridge.
      const response = await tatumService.getTransactionDetailFromSignature(strapi, job, contractEntity.signatureId);
      txId = _.get(response, "txId", undefined);
      await Sleep(strapi.config.get('server.retryLoop.sleepWaitTimeLoop'));
    }

    if (txId === undefined) {
      throw new Error("Error: Transaction has not been signed - Timeout");
    }

    contractEntity = await nftContractService.updateContractEntity(
      contractEntity.id,
      {
        transactionId: txId
      }
    );
    job.pushProgress({ topic: 'NFT_COLLECTION_CONTRACT', msg: 'NFT contract: Created' });
  }

  if (!contractEntity.contractAddress) {
    const { contractAddress } = await tatumService.getNFTContractAddress(strapi, job, contractEntity.blockchain, contractEntity.transactionId);

    contractEntity = await nftContractService.updateContractEntity(
      contractEntity.id,
      {
        contractAddress
      }
    );

    job.pushProgress({ topic: 'NFT_COLLECTION_CONTRACT', msg: `NFT contract: Address -> ${contractEntity}`, data: contractEntity });
  }

  return contractEntity;
};

module.exports = {
  getOrCreateNFTContractAddress
};

'use strict';

const { deployNFT, getNFTContractAddress, Currency } = require('@tatumio/tatum');

const getOrCreateContractAddress = async (nftMintOrderEntity, strapi, job) => {
  const { blockchain, user: { id: userId } } = nftMintOrderEntity;

  const controllerAPI = strapi.service('api::nft-contract.nft-contract');
  const nftContractDB = strapi.db.query('api::nft-contract.nft-contract');

  let contractEntity = await nftContractDB.findOne({
    where: {
      user: userId,
      blockchain: blockchain,
    }
  });

  if (!contractEntity) {
    contractEntity = await controllerAPI.create(
      {
        data: {
          name: '',
          symbol: '',
          blockchain: blockchain,
          // transactionID: null,
          // contractAddress:null,
          user: userId,
        }
      }
    );
  }

  const privateKey = strapi.config.get('server.blockchainKeys')[blockchain];
  const useTestNet = strapi.config.get('server.blockchainUseTestNet');

  let updateData;
  let transaction;

  if (!contractEntity.transactionID) {
    // call Tatum
    transaction = await deployNFT(useTestNet,
      {
        chain: Currency[blockchain],
        name: `ERC721_${blockchain}_${userId}`,
        publicMint: false, // This is IMPORTANT to set to false; Only the privateKey can mint
        symbol: `ERC_SYMBOL_${blockchain}_${userId}`,
        fromPrivateKey: privateKey,
        provenance: true,
        feeCurrency: Currency.CUSD,
      });

    if (transaction.failed) {
      strapi.log.error("Creation of contract failed: \n" + JSON.stringify(transaction));
      // Throw error
      throw new Error("Creation of contract failed: \n" + JSON.stringify(transaction));
    }

    // Update contract entity with transaction.txId
    updateData = {
      id: contractEntity.id,
      data: {
        transactionID: transaction.txId,
      }
    }

    job.updateProgress({ msg: 'NFT contract created' });
  }

  if (!contractEntity.contractAddress) {
    const contractAddress = await getNFTContractAddress(Currency[blockchain], transaction);
    updateData = {
      ...updateData,
      data: {
        ...updateData.data,
        contractAddress: { contractAddress }
      }
    };

    job.updateProgress({ msg: 'NFT Address transaction found' });
  }

  if (updateData) {
    contractEntity = await nftContractDB.update(updateData.id, updateData.data);
    // log
    strapi.log.info(`Contract updated: ${JSON.stringify(contractEntity)}`);
  }

  return contractEntity;
};

module.exports = ({ strapi }) => ({
  createJob: async ctx => {
    strapi.log.info('ENTER createJob');
    const queue = strapi
      .plugin('nft-engine')
      .bull.queue;

    const data = await queue.add('mint-nft', { color: 'pink' });

    strapi.log.info('EXIT createJob');
    return JSON.stringify(data);
  },
  mintNFTJob: async job => {
    strapi.log.info('ENTER mintNFTJob');
    const {
      nftMintOrderEntity,
      tikTokVideoMetadata,
      s_v_web_id,
      sid_ucp_v1
    } = job.data;

    const nftContractEntity = getOrCreateContractAddress(nftMintOrderEntity, strapi);

    // Do something with job
    return 'some value';
  },
  mintNFTJobCompleted: async (job, returnValue) => {
    strapi.log.info('ENTER mintNFTJobCompleted');
    strapi.log.debug(JSON.stringify(job));
    strapi.log.debug(JSON.stringify(returnValue));
    strapi.log.info('EXIT mintNFTJobCompleted');
  },
  mintNFTJobProgress: async (job, progress) => {
    strapi.log.info('ENTER mintNFTJobProgress');
    strapi.log.debug(JSON.stringify(job));
    strapi.log.debug(JSON.stringify(progress));
    strapi.log.info('EXIT mintNFTJobProgress');
  },
  mintNFTJobFailed: async (job, failedReason) => {
    strapi.log.info('ENTER mintNFTJobFailed');
    strapi.log.debug(JSON.stringify(job.attemptsMade));
    strapi.log.debug(JSON.stringify(failedReason));
    // strapi.log.info('EXIT mintNFTJobFailed');
  }
});

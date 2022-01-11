'use strict';

const { deployNFT, getNFTContractAddress, Currency } = require('@tatumio/tatum');

// require lodash
const _ = require('lodash');

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

    let updateData = {};
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
                ...updateData?.data,
                contractAddress: { contractAddress }
            }
        };

        job.updateProgress({ msg: 'NFT Address transaction found' });
    }

    if (_.isEmpty(updateData)) {
        contractEntity = await nftContractDB.update(updateData.id, updateData.data);
        // log
        strapi.log.info(`Contract updated: ${JSON.stringify(contractEntity)}`);
    }

    return contractEntity;
}

module.exports = {
    getOrCreateContractAddress
};

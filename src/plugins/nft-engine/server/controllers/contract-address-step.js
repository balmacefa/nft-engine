'use strict';

// const { deployNFT, getNFTContractAddress, Currency } = require('@tatumio/tatum');
const tatumService = require('./tatumService');

// require lodash
const _ = require('lodash');

const getOrCreateContractAddress = async (strapi, job) => {

    const blockchain = "MATIC",
    const {
        userId
    } = job.data;

    const controllerAPI = strapi.service('api::nft-contract.nft-contract');
    const nftContractDB = strapi.db.query('api::nft-contract.nft-contract');

    const signatureId = strapi.config.get('server.tatum.signatureId');
    const useTestNet = strapi.config.get('server.tatum.useTestNet');

    const name = `ERC721_${blockchain}_${userId}`;
    const symbol = `ERC_SYMBOL_${blockchain}_${userId}`;

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
                    name,
                    symbol,
                    blockchain,
                    // transactionID: null,
                    // contractAddress:null,
                    user: userId,
                    useTestNet
                }
            }
        );
    }

    let updateData = {};
    let transaction;

    if (!contractEntity.transactionID) {
        // call Tatum
        // Because Polygon is an Ethereum-compatible blockchain, this means that any token or wallet address you have on Ethereum is also interchangeable with Polygon. You can use the exact same wallet address to interact between your regular ERC20 tokens on Ethereum and with Polygon using the Matic bridge.
        transaction = await tatumService.deployNFT(strapi,
            {
                name,
                chain: "MATIC",
                symbol,
                provenance: true,
                publicMint: false, // This is IMPORTANT to set to false; Only the privateKey can mint
                signatureId: signatureId,
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
        const { contractAddress } = await tatumService.getNFTContractAddress(transaction);
        updateData = {
            ...updateData,
            data: {
                ...updateData?.data,
                contractAddress: contractAddress
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

'use strict';

// const { deployNFT, getNFTContractAddress, Currency } = require('@tatumio/tatum');
const tatumService = require('./tatumService');

// require lodash
const _ = require('lodash');

const Sleep = require('await-sleep');

const getOrCreateContractAddress = async (strapi, job) => {

    const blockchain = "MATIC";
    const {
        userId
    } = job.data;

    const controllerAPI = strapi.service('api::nft-contract.nft-contract');
    const nftContractDB = strapi.db.query('api::nft-contract.nft-contract');

    const tatumSignerId = strapi.config.get('server.tatum.signatureId');

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
                    // transactionId: null,
                    // contractAddress:null,
                    user: userId,
                }
            }
        );
    }


    if (!contractEntity.signatureId) {
        // call Tatum
        // Because Polygon is an Ethereum-compatible blockchain, this means that any token or wallet address you have on Ethereum is also interchangeable with Polygon. You can use the exact same wallet address to interact between your regular ERC20 tokens on Ethereum and with Polygon using the Matic bridge.
        const response = await tatumService.deployNFT(strapi,
            {
                name,
                chain: "MATIC",
                symbol,
                provenance: true,
                publicMint: false, // This is IMPORTANT to set to false; Only the privateKey can mint
                signatureId: tatumSignerId,
            });

        if (response.failed) {
            strapi.log.error("Creation of contract failed: \n" + JSON.stringify(response));
            // Throw error
            throw new Error("Creation of contract failed: \n" + JSON.stringify(response));
        }

        // Update contract entity with transaction.signatureId
        contractEntity = await nftContractDB.update(contractEntity.id, {
            signatureId: response.signatureId
        });

        job.updateProgress({ msg: 'NFT contract queued' });
    }

    if (!contractEntity.transactionId) {
        // to be sure the contract is being signed:
        let txId = undefined;

        while (txId === undefined) {
            // call Tatum
            // Because Polygon is an Ethereum-compatible blockchain, this means that any token or wallet address you have on Ethereum is also interchangeable with Polygon. You can use the exact same wallet address to interact between your regular ERC20 tokens on Ethereum and with Polygon using the Matic bridge.
            const response = await tatumService.getTransactionDetailFromSignature(strapi, contractEntity.signatureId);
            txId = _.get(response, "txId", undefined);
            await Sleep(strapi.config.get('server.tatum.waitSigning'))
        }

        contractEntity = await nftContractDB.update(contractEntity.id, {
            transactionId: txId
        });
        job.updateProgress({ msg: 'NFT contract created' });
    }

    if (!contractEntity.contractAddress) {
        const { contractAddress } = await tatumService.getNFTContractAddress(transaction);

        contractEntity = await nftContractDB.update(contractEntity.id, {
            contractAddress
        });

        job.updateProgress({ msg: `NFT contract address ${contractEntity}` });
    }

    return contractEntity;
}

module.exports = {
    getOrCreateContractAddress
};

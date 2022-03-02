'use strict';

const tatumService = require('./services/tatumService');
const Sleep = require('await-sleep');

// require lodash
const _ = require('lodash');

const mintTiktokNFT = async (nftMetadataUrl, strapi, job) => {
    job.pushProgress({ msg: 'Mint NFT: Init' });

    const {
        nftMintOrderEntity,
        nftContractEntity: {
            contractAddress
        },
        videoId
    } = job.data;

    let mintOrderEntity = nftMintOrderEntity;

    // Docs: https://docs.tatum.io/guides/blockchain/how-to-create-royalty-nfts-with-percentage-cashback-and-provenance-data#minting-a-new-unique-erc-721-token

    const nftMintOrderDb = strapi.db.query('api::nft-mint-order.nft-mint-order');

    const body = {

        to: mintOrderEntity.sendAddress,
        url: nftMetadataUrl,
        tokenId: videoId,
        provenance: true,
        // authorAddresses: [], authorAddresses -> the address or addresses to which cashback will be sent.
        // cashbackValues: ["0.5"],  cashbackValues  -> the percentage value(s) of the cashback to be sent.
        // In the example below, the value "0.5" means that 0.005% of the sale price will be transferred to the author each time the NFT is transferred.
        chain: mintOrderEntity.blockchain,
        contractAddress,
        signatureId: strapi.config.get('server.tatum.signatureId'),
    }

    // set default royalties, 2.5% to criptok:
    let cashbackValues = [strapi.config.get('server.tatum.fixedRoyalty.amount')];
    let authorAddresses = [strapi.config.get('server.tatum.fixedRoyalty.walletAddress')];

    if (mintOrderEntity.isSplitRoyaltyRate) {
        authorAddresses = _.concat(authorAddresses, _.map(mintOrderEntity.splitAddress, (address) => address.address));
        cashbackValues = _.concat(cashbackValues, _.map(_.map(mintOrderEntity.splitAddress, (address) => address.splitRoyaltyRate * 100)));
    }

    body.cashbackValues = cashbackValues;
    body.authorAddresses = authorAddresses;


    if (!mintOrderEntity.signatureId) {
        const { signatureId } = await tatumService.mintNFTWithUri(strapi, body);
        // call Tatum
        // Because Polygon is an Ethereum-compatible blockchain, this means that any token or wallet address you have on Ethereum is also interchangeable with Polygon. You can use the exact same wallet address to interact between your regular ERC20 tokens on Ethereum and with Polygon using the Matic bridge.

        // Update contract entity with transaction.signatureId
        mintOrderEntity = await nftMintOrderDb.update(
            {
                where: {
                    id: mintOrderEntity.id

                },
                data: {
                    signatureId
                }

            });

        job.pushProgress({ msg: 'Mint NFT: Queued' });
    }

    if (!mintOrderEntity.transactionId) {
        // to be sure the contract is being signed:
        let txId = undefined;
        const initTime = Date.now();
        // Wait max of 30 min for the transaction to be signed
        const maxTime = strapi.config.get('server.retryLoop.maxWaitTimeLoop');
        while (txId === undefined && Date.now() - initTime < maxTime) {
            job.pushProgress({ msg: `Mint NFT: Waiting for blockchain confirmation` });
            // call Tatum
            // Because Polygon is an Ethereum-compatible blockchain, this means that any token or wallet address you have on Ethereum is also interchangeable with Polygon. You can use the exact same wallet address to interact between your regular ERC20 tokens on Ethereum and with Polygon using the Matic bridge.
            const response = await tatumService.getTransactionDetailFromSignature(strapi, mintOrderEntity.signatureId);
            txId = _.get(response, "txId", undefined);
            if (!txId) {
                await Sleep(strapi.config.get('server.retryLoop.sleepWaitTimeLoop'))
            }
        }


        if (txId === undefined) {
            throw new Error("Error: Transaction has not been signed - Timeout");
        }


        mintOrderEntity = await nftMintOrderDb.update(
            {
                where: {
                    id: mintOrderEntity.id
                },
                data: {
                    transactionId: txId,
                    contractAddress
                }
            });
        job.pushProgress({ msg: 'Mint NFT: NFT contract created' });
    }


    // update job status
    job.pushProgress({ msg: `Mint NFT: Address -> ${mintOrderEntity.transactionId}`, data: mintOrderEntity.transactionId });


    return mintOrderEntity;
};


module.exports = {
    mintTiktokNFT
};

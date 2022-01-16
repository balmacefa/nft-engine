'use strict';

const { deployNFT, getNFTContractAddress, mintNFTWithUri, Currency } = require('@tatumio/tatum');

// require lodash
const _ = require('lodash');

const getOrCreateContractAddress = async (nftMintOrderEntity, strapi, job) => {
    const { blockchain, user: { id: userId } } = nftMintOrderEntity;

    const controllerAPI = strapi.service('api::nft-contract.nft-contract');
    const nftContractDB = strapi.db.query('api::nft-contract.nft-contract');

    const useTestNet = strapi.config.get('server.blockchainUseTestNet');

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

    const privateKey = strapi.config.get('server.blockchainKeys')[blockchain];

    let updateData = {};
    let transaction;

    if (!contractEntity.transactionID) {
        // call Tatum
        transaction = await deployNFT(useTestNet,
            {
                name,
                symbol,
                chain: Currency[blockchain],
                publicMint: false, // This is IMPORTANT to set to false; Only the privateKey can mint
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
        const { contractAddress } = await getNFTContractAddress(Currency[blockchain], transaction);
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

const mintTiktokNFT = async (nftMetadata, nftContractEntity, strapi, job) => {
    job.updateProgress({ msg: 'Minting NFT' });

    const {
        tikTokVideoMetadata,
        nftMintOrderEntity
    } = job.data;

    const videoId = _.get(tikTokVideoMetadata, 'itemInfo.itemStruct.video.id');

    // Docs: https://docs.tatum.io/guides/blockchain/how-to-create-royalty-nfts-with-percentage-cashback-and-provenance-data#minting-a-new-unique-erc-721-token
    const privateKey = strapi.config.get('server.blockchainKeys')[blockchain];

    const body = {

        to: nftMintOrderEntity.sendAddress,
        url: metaUrl,
        tokenId: videoId,
        provenance: true,
        // authorAddresses: [], authorAddresses -> the address or addresses to which cashback will be sent.
        // cashbackValues: ["0.5"],  cashbackValues  -> the percentage value(s) of the cashback to be sent.
        // In the example below, the value "0.5" means that 0.005% of the sale price will be transferred to the author each time the NFT is transferred.
        chain: Currency[nftContractEntity.blockchain],
        contractAddress: nftContractEntity.contractAddress,
        fromPrivateKey: privateKey
    }

    if (nftMintOrderEntity.isSplitRoyaltyRate) {
        body.authorAddresses = _.map(nftMintOrderEntity.splitAddress, (address) => address.address);
        body.cashbackValues = _.map(nftMintOrderEntity.splitAddress, (address) => address.splitRoyaltyRate * 100);
    }

    const transactionHash = await mintNFTWithUri(useTestNet, body);

};


module.exports = {
    getOrCreateContractAddress
};

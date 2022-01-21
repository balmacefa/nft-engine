'use strict';

const { mintNFTWithUri, Currency } = require('@tatumio/tatum');

// require lodash
const _ = require('lodash');

const mintTiktokNFT = async (nftMetadataUrl, nftContractEntity, strapi, job) => {
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
        url: nftMetadataUrl,
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
    return transactionHash;
};


module.exports = {
    mintTiktokNFT
};

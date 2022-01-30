'use strict';

// require lodash
const _ = require('lodash');
const Temp = require('temp');
const fs = require('fs');
const tatumService = require('./tatumService');

const getTiktokMetadata = async (coverAndVideoMeta, strapi, job) => {
    job.updateProgress({ msg: 'Building NFT metadata' });

    const {
        tikTokVideoMetadata
    } = job.data;

    const { itemInfo: {
        itemStruct: {
            stats: {
                diggCount: likesCount,
                shareCount,
                commentCount,
                playCount
            },
            challenges,
            createTime,
            author: { uniqueId: authorUserName, nickname: authorNickname } } },
        shareMeta: { title, desc }
    } = tikTokVideoMetadata;

    let attributes = [];

    const attribute = (trait_type, value, display_type) => (
        {
            trait_type,
            value,
            // if display_type is not provided, it will not be set
            ...display_type && { display_type }
        }
    );

    const mintTimestamp = Math.round(new Date().getTime() / 1000);

    attributes.push(
        attribute('Author Username', authorUserName),
        attribute('Author Nickname', authorNickname),

        attribute('Likes', likesCount, 'number'),
        attribute('Shares', shareCount, 'number'),
        attribute('Comments', commentCount, 'number'),
        attribute('Plays', playCount, 'number'),


        attribute('Tiktok Birthday', createTime, 'date'),
        attribute('Mint Birthday', mintTimestamp, 'date'),
    )

    // Add Hashtag
    attributes = attributes.concat(attributes,
        challenges?.map(({ title }) => attribute('Hashtag', title)));

    const metadata = {
        "name": title,
        ...coverAndVideoMeta,
        "description": desc,
        attributes
    };
    job.updateProgress({ msg: 'NFT metadata built' });
    return metadata;
};

// uploadTiktokMetadataToIPFS
const uploadTiktokMetadataToIPFS = async (nftMetadata, strapi, job) => {
    // return "https://pastebin.com/raw/vMSmic4B";
    const {
        tikTokVideoMetadata
    } = job.data;


    job.updateProgress({ msg: 'Uploading NFT metadata to IPFS' });
    const videoId = _.get(tikTokVideoMetadata, 'itemInfo.itemStruct.video.id');

    const { path } = Temp.openSync({
        prefix: `criptok_metadata_${videoId}`,
        suffix: `.json`
    });

    // save nftMedata to path
    fs.writeFileSync(path, JSON.stringify(nftMetadata), 'utf8');

    const ipfs = await tatumService.uploadIpfs(strapi, path);
    // response example:
    // {
    //   "ipfsHash": "bafybeihrumg5hfzqj6x47q63azflcpf6nkgcvhzzm6/test-356.jpg"
    // }
    return `ipfs://${ipfs}`;
}

module.exports = {
    getTiktokMetadata,
    uploadTiktokMetadataToIPFS,
};

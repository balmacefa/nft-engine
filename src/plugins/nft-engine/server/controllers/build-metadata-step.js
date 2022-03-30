'use strict';

// require lodash
const _ = require('lodash');
const Temp = require('temp');
const fs = require('fs');
const pinataService = require('./services/pinataService');

const getTiktokMetadata = async (coverVideoIPFS, strapi, job) => {
    job.pushProgress({ msg: 'NFT metadata: Building' });

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
            challenges: hashtags,
            createTime,
            author: { uniqueId: authorUserName, nickname: authorNickname } } },
        shareMeta: { title, desc }
    } = tikTokVideoMetadata;

    let attributes = [];

    const getAttribute = (trait_type, value, display_type) => (
        {
            trait_type,
            value,
            // if display_type is not provided, it will not be set
            ...display_type && { display_type }
        }
    );

    const mintTimestamp = Math.round(new Date().getTime() / 1000);

    attributes.push(
        getAttribute('Author Username', authorUserName),
        getAttribute('Author Nickname', authorNickname),

        getAttribute('Likes', likesCount, 'number'),
        getAttribute('Shares', shareCount, 'number'),
        getAttribute('Comments', commentCount, 'number'),
        getAttribute('Plays', playCount, 'number'),


        getAttribute('Tiktok Birthday', createTime, 'date'),
        getAttribute('Mint Birthday', mintTimestamp, 'date'),
    )

    // Add Hashtag
    const hashtagList = hashtags.map(({ title }) => getAttribute('Hashtag', title));
    attributes = _.concat(attributes,hashtagList);

    const metadata = {
        "name": title,
        ...coverVideoIPFS,
        "description": desc,
        attributes
    };
    job.pushProgress({ msg: 'NFT metadata: Built' });
    return metadata;
};

// uploadTiktokMetadataToIPFS
const uploadTiktokMetadataToIPFS = async (nftMetadata, strapi, job) => {
    const {
        videoId,
        userId
    } = job.data;

    job.pushProgress({ msg: 'NFT metadata: Uploading metadata to IPFS' });
    const { path } = Temp.openSync({
        prefix: `criptok_metadata_${videoId}`,
        suffix: `.json`
    });

    // save nftMedata to path
    fs.writeFileSync(path, JSON.stringify(nftMetadata), 'utf8');

    const ipfs = await pinataService.pinFileToIPFS(strapi, path,
        {
            name: `metadata_${videoId}`,
            keyvalues: {
                type: 'metadata',
                format: 'json',
                videoId: videoId,
                userId
            }
        });

    // update there
    return `ipfs://${ipfs.IpfsHash}`;
}

module.exports = {
    getTiktokMetadata,
    uploadTiktokMetadataToIPFS,
};

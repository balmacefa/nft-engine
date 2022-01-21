'use strict';

const { ipfsUpload } = require('@tatumio/tatum');
const { v4: uuidv4 } = require('uuid');

// require lodash
const _ = require('lodash');


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

    const attributes = [];

    const attribute = (trait_type, value, display_type) => (
        {
            trait_type,
            value,
            // if display_type is not provided, it will not be set
            ...display_type && { display_type }
        }
    );

    const properties = {
        hashtags: {
            name: "Hashtags",
            value: challenges?.map(({ title }) => title),
        },
        author: {
            name: "Author Username",
            value: authorUserName
        },
        author: {
            name: "Author Nickname",
            value: authorNickname
        },
    };

    const mintTimestamp = Math.round(new Date().getTime() / 1000);

    attributes.push(
        attribute('Likes', likesCount, 'number'),
        attribute('Shares', shareCount, 'number'),
        attribute('Comments', commentCount, 'number'),
        attribute('Plays', playCount, 'number'),
        attribute('Tiktok Birthday', createTime, 'date'),
        attribute('Mint Birthday', mintTimestamp, 'date'),
    )
    const metadata = {
        "name": title,
        ...coverAndVideoMeta,
        "description": desc,
        attributes,
        properties
    };
    job.updateProgress({ msg: 'NFT metadata built' });
    return metadata;
};

// uploadTiktokMetadataToIPFS
const uploadTiktokMetadataToIPFS = async (nftMetadata, strapi, job) => {
    const {
        tikTokVideoMetadata
    } = job.data;


    job.updateProgress({ msg: 'Uploading NFT metadata to IPFS' });
    const videoId = _.get(tikTokVideoMetadata, 'itemInfo.itemStruct.video.id');
    const metadataBuffer = Buffer.from(JSON.stringify(nftMetadata), 'utf8');
    const responseIPFS = await ipfsUpload(metadataBuffer, `nft_tiktok_metadata_${videoId}__${uuidv4()}__.json`);
    // response example:
    // {
    //   "ipfsHash": "bafybeihrumg5hfzqj6x47q63azflcpf6nkgcvhzzm6/test-356.jpg"
    // }
    return `ipfs://${responseIPFS.ipfsHash}`;
}

module.exports = {
    getTiktokMetadata,
    uploadTiktokMetadataToIPFS,
};

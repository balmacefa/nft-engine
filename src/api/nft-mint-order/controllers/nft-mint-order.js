'use strict';

/**
 *  nft-mint-order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { validateYupSchema } = require('@strapi/utils');
const axios = require('axios');

const mintOrderSchema = require('./MintFormValidationSchema.js');

module.exports = createCoreController('api::nft-mint-order.nft-mint-order', ({ strapi }) => ({
    createMintNFTOrder: async ctx => {
        strapi.log.info('ENTER POST /nft-mint-order/createMintNFTOrder');
        strapi.log.debug(JSON.stringify(ctx?.request?.body));

        // validate request body
        await validateYupSchema(mintOrderSchema)(ctx.request.body);

        const controllerAPI = strapi.service('api::nft-mint-order.nft-mint-order');

        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id
        let tikTokVideoId;
        const {
            tikTokUrl,
            blockchain,
            singleAddress, // send to this address (owner of the NFT), and use as royalty address if isSplitRoyaltyRate is false
            extraComment,
            isSplitRoyaltyRate,
            royaltyRate, // use if isSplitRoyaltyRate is false
            splitAddress, // use if isSplitRoyaltyRate is true
            s_v_web_id,
            sid_ucp_v1,
        } = ctx.request.body;

        // validate that tikTokUrl is the owner of the tiktok
        const axiosInstance = axios.create(strapi.config.get('server.tiktok_api_axios_config'));

        // tikTokUrl Example:
        // https://www.tiktok.com/@sanyabeckerr/video/7024893021720218881?is_copy_url=1&is_from_webapp=v1
        // Get the video id from the url: 7024893021720218881
        tikTokVideoId = tikTokUrl.split('/').pop().split('?')[0];

        // the the video metadata
        const { data: tikTokVideoMetadata } = await axiosInstance.get(`/api/video/${tikTokVideoId}`,
            {
                data: {
                    s_v_web_id,
                    sid_ucp_v1
                }
            }
        );
        const { itemInfo: { itemStruct: { author } } } = tikTokVideoMetadata;

        // validate that the user is the owner of the tiktok
        if (author.id !== "6612341770439917573") { // TODO: change to user.id
            return ctx.badRequest('User is not the owner of the TikTok')
        }

        let entity;
        try {
            // Register the order in the database
            entity = await controllerAPI.create(
                {
                    data: {
                        sendAddress: singleAddress,
                        blockchain: blockchain,
                        extraMessage: extraComment,
                        royalties: {
                            isSplitRoyaltyRate,
                            singleAddress: singleAddress,
                            royaltyRate: royaltyRate,
                            splitAddress: splitAddress,
                        },
                        // transactionID: null,
                        // contractAddress:null,
                        status: 'pending',
                        user: userId,
                    }
                }
            );

        } catch (err) {
            strapi.log.error(`ERROR: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.badRequest(`Error while creating mint order`);
        }

        try {
            const jobData = {
                nftMintOrderEntity: entity,
                tikTokVideoMetadata,
                s_v_web_id,
                sid_ucp_v1,
                userId,
            }
            const queue = strapi
                .plugin('nft-engine')
                .bull.queue;

            const data = await queue.add('mint-nft', { ...jobData }, {
                jobId: tikTokVideoId,
            });
            strapi.log.debug(`Job Created: \n ${JSON.stringify(data)}`);

        } catch (err) {
            strapi.log.error(`ERROR: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.badRequest(`Error while creating mint order job \n ${err.message}`);
        }
        strapi.log.info(`EXIT POST /nft-mint-order/createMintNFTOrder \n ${entity}`);
        return entity;
    }

}));

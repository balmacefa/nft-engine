'use strict';

/**
 *  nft-mint-order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { validateYupSchema } = require('@strapi/utils');
const axios = require('axios');

const mintOrderSchema = require('./MintFormValidationSchema.js');


// get lodash
const _ = require('lodash');

module.exports = createCoreController('api::nft-mint-order.nft-mint-order', ({ strapi }) => ({
    createMintNFTOrder: async ctx => {
        strapi.log.info('ENTER POST /nft-mint-order/createMintNFTOrder');
        strapi.log.debug(JSON.stringify(ctx?.request?.body));

        // validate request body
        await validateYupSchema(mintOrderSchema)(ctx.request.body);

        const nftMintOrderDB = strapi.db.query('api::nft-mint-order.nft-mint-order');


        //  check if user has remaining balance
        
        
        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id
        const PackageOrderController = strapi.controller('api::package-order.package-order');

        if(_.isEmpty(PackageOrderController.getLastPackageOrderDB(strapi, userId, 'DECREASE'))) {
            return ctx.badRequest('You have no remaining balance to mint, please purchase more packages mints');
        }


        const {
            tikTokUrl,
            singleAddress, // send to this address (owner of the NFT), and use as royalty address if isSplitRoyaltyRate is false
            extraComment,
            isSplitRoyaltyRate,
            royaltyRate, // use if isSplitRoyaltyRate is false
            splitAddress, // use if isSplitRoyaltyRate is true
        } = ctx.request.body;

        const blockchain = "MATIC";

        // validate that tikTokUrl is the owner of the tiktok
        const axiosInstance = axios.create(strapi.config.get('server.tiktok_api_axios_config'));

        // tikTokUrl Example:
        // https://www.tiktok.com/@sanyabeckerr/video/7024893021720218881?is_copy_url=1&is_from_webapp=v1
        // Get the video id from the url: 7024893021720218881
        const tikTokVideoId = tikTokUrl.split('/').pop().split('?')[0];

        // the the video metadata
        const { data: tikTokVideoMetadata } = await axiosInstance.get(`/api/video/${tikTokVideoId}`,
            {
                // data: {
                //     s_v_web_id,
                //     sid_ucp_v1
                // }
            }
        );
        const { itemInfo: { itemStruct: { author } } } = tikTokVideoMetadata;

        // validate that the user is the owner of the tiktok TODO
        // if (author.id !== "6612341770439917573") { // TODO: change to user.id
        //     return ctx.badRequest('User is not the owner of the TikTok')
        // }

        let entity;
        try {
            entity = await nftMintOrderDB.findOne({
                where: {
                    tikTokVideoId: tikTokVideoId
                }
            });

            if (!entity) {
                entity = await nftMintOrderDB.create(
                    {
                        data: {
                            sendAddress: singleAddress,
                            blockchain,
                            tikTokVideoId,
                            extraMessage: extraComment,
                            royalties: {
                                isSplitRoyaltyRate,
                                singleAddress: singleAddress,
                                royaltyRate: royaltyRate,
                                splitAddress: splitAddress,
                            },
                            // transactionId: null,
                            // contractAddress:null,
                            status: 'pending',
                            user: userId,
                        }
                    }
                );
            }
        } catch (err) {
            strapi.log.error(`ERROR: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.badRequest(`Error while creating mint order`);
        }

        try {
            const jobData = {
                nftMintOrderEntity: entity,
                tikTokVideoMetadata,
                userId,
                videoId: tikTokVideoId
            }
            const queue = strapi
                .plugin('nft-engine')
                .bull.queue;
            // bullMQ
            // find by project id
            const job = await queue.getJob(tikTokVideoId);
            let createJob = true;
            if (job) {
                strapi.log.info(`Job already exists for ${tikTokVideoId}`);
                if (job.attemptsMade >= job.opts.attempts) {
                    // remove job from queue
                    await job.remove();
                    strapi.log.info(`Job removed from queue for ${tikTokVideoId} due to max attempts`);
                } else {
                    // job is already in queue
                    strapi.log.info(`Job already exists for ${tikTokVideoId} and will be retried`);
                    createJob = false;
                }
            }

            if (createJob) {
                const data = await queue.add('mint-nft', { ...jobData }
                    , {
                        jobId: tikTokVideoId,
                    }
                );
                strapi.log.debug(`Job Created: \n ${JSON.stringify(data)}`);
            }

        } catch (err) {
            strapi.log.error(`ERROR: \n ${err.message}`);
            strapi.log.error(JSON.stringify(err));
            return ctx.badRequest(`Error while creating mint order job \n ${err.message}`);
        }
        strapi.log.info(`EXIT POST /nft-mint-order/createMintNFTOrder \n ${entity}`);
        return entity;
    },
    getListByUser: async ctx => {
        strapi.log.info('ENTER GET /nft-mint-order/getListByUser');
        strapi.log.debug(JSON.stringify(ctx?.request?.body));

        const nftMintOrderController = strapi.controller('api::nft-mint-order.nft-mint-order');
        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id

        let {
            page,
            pageSize
        } = ctx.request.query;
        // set default values and parse to int
        page = parseInt(page || 0);
        // clamp pageSize between 1 and 100
        pageSize = Math.max(1, Math.min(parseInt(pageSize || 10), 100));

        const entities = await nftMintOrderController.find(
            {
                query: {
                    filters: {
                        user: userId
                    },
                    pagination: {
                        page,
                        pageSize,
                    },
                    sort: [
                        {
                            // newest first
                            createdAt: 'DESC'
                        }
                    ]
                }
            }
        );

        strapi.log.info(`EXIT GET /nft-mint-order/getListByUser \n ${JSON.stringify(entities)}`);
        return entities;
    },
    getMyOrder: async ctx => {
        strapi.log.info('ENTER GET /nft-mint-order/getMyOrder');
        strapi.log.debug(JSON.stringify(ctx?.request?.body));

        const nftMintOrderController = strapi.controller('api::nft-mint-order.nft-mint-order');
        // const userId = ctx.state.user; //TODO: change to user.id
        const userId = "1"; //TODO: change to user.id

        let {
            id
        } = ctx.request.query;

        const result = await nftMintOrderController.find(
            {
                query: {
                    filters: {
                        $or: [
                            {
                                transactionId: id
                            },
                            {
                                tikTokVideoId: id
                            },
                            {
                                id: id
                            }
                        ],
                        user: userId
                    },
                    pagination: {
                        limit: 1
                    }
                }
            }
        );
        const entity = _.get(result, "data[0].attributes", null);
        if (!entity) {
            return ctx.notFound(`No order found for id ${id}`);
        }
        entity.id = _.get(result, "data[0].id");
        strapi.log.info(`EXIT GET /nft-mint-order/getMyOrder \n ${JSON.stringify(entity)}`);
        return entity;
    }

}));

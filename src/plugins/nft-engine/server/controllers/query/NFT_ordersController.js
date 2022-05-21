'use strict';

/**
 *  NFT_OrdersController
 */

// get lodash
const _ = require('lodash');

module.exports = ({ strapi }) => ({
  findOne: async ctx => {
    strapi.log.info('ENTER GET /NFT_orders/{id}');
    strapi.log.debug(JSON.stringify(ctx?.request?.body));

    const nftMintOrderController = strapi.controller('api::nft-mint-order.nft-mint-order');

    const userId = ctx.state.rapidApi.user;

    let {
      id
    } = ctx.request.params;

    const result = await nftMintOrderController.find(
      {
        query: {
          filters: {
            $or: [
              {
                transactionId: id
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
    strapi.log.info(`EXIT GET /NFT_orders/{id} \n ${JSON.stringify(entity)}`);
    return entity;
  },
  getListByUser: async ctx => {
    strapi.log.info('ENTER GET /NFT_orders');
    strapi.log.debug(JSON.stringify(ctx?.request?.body));

    const nftMintOrderController = strapi.controller('api::nft-mint-order.nft-mint-order');

    const userId = ctx.state.rapidApi.user;

    let {
      page,
      pageSize,
      status,
      network,
      contractAddress,
      blockchain,
    } = ctx.request.query;

    let useTestNet = network !== 'mainnet' ? true : false;

    // set default values and parse to int
    page = parseInt(page || 0);
    // clamp pageSize between 1 and 100
    pageSize = Math.max(1, Math.min(parseInt(pageSize || 10), 100));


    const filters = {
      user: userId
    };

    if (network) {
      filters.useTestNet = useTestNet;
    }
    if (status) {
      filters.status = status;
    }
    if (contractAddress) {
      filters.contractAddress = contractAddress;
    }
    if (blockchain) {
      filters.blockchain = blockchain;
    }

    const entities = await nftMintOrderController.find(
      {
        query: {
          filters,
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

    strapi.log.info(`EXIT GET /NFT_orders \n ${JSON.stringify(entities)}`);
    return entities;
  },
});

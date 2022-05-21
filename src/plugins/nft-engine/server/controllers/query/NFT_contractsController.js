'use strict';

/**
 *  NFT_OrdersController
 */

// get lodash
const _ = require('lodash');

const getNFTContractEntity = async (strapi, id, userId) => {
  const nftContractController = strapi.controller('api::nft-contract.nft-contract');
  const result = await nftContractController.find(
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
  entity.id = _.get(result, "data[0].id");
  return entity;
};

module.exports = ({ strapi }) => ({
  getNFTContractEntity: getNFTContractEntity,
  findOne: async ctx => {
    strapi.log.info('ENTER GET /NFT_contracts/{id}');
    strapi.log.debug(JSON.stringify(ctx?.request?.body));

    const userId = ctx.state.rapidApi.user;

    let {
      id
    } = ctx.request.params;

    const entity = getNFTContractEntity(strapi, id, userId);
    if (!entity) {
      return ctx.notFound(`No order found for id ${id}`);
    }

    strapi.log.info(`EXIT GET /NFT_contracts/{id} \n ${JSON.stringify(entity)}`);
    return entity;
  },
  getListByUser: async ctx => {
    strapi.log.info('ENTER GET /NFT_contracts');
    strapi.log.debug(JSON.stringify(ctx?.request?.body));

    const nftContractController = strapi.controller('api::nft-contract.nft-contract');

    const userId = ctx.state.rapidApi.user;

    let {
      page,
      pageSize,
      symbol,
      blockchain,
      network,
      collectionName,
    } = ctx.request.query;

    const filters = {
      user: userId
    };

    let useTestNet = network !== 'mainnet' ? true : false;

    if (network) {
      filters.useTestNet = useTestNet;
    }

    if (blockchain) {
      filters.blockchain = blockchain;
    }

    if (symbol) {
      filters.symbol = symbol;
    }

    if (collectionName) {
      filters.collectionName = collectionName;
    }

    // set default values and parse to int
    page = parseInt(page || 0);
    // clamp pageSize between 1 and 100
    pageSize = Math.max(1, Math.min(parseInt(pageSize || 10), 100));

    const entities = await nftContractController.find(
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

    strapi.log.info(`EXIT GET /NFT_contracts \n ${JSON.stringify(entities)}`);
    return entities;
  },
});

'use strict';

// import { Queue } from 'bullmq';
// import { Worker } from 'bullmq'

module.exports = ({ strapi }) => {
  strapi.log.info('nft-engine: server: bootstrap: start');
  strapi
      .plugin('nft-engine')
      .init = {
        foo: 'bar'
      }
};

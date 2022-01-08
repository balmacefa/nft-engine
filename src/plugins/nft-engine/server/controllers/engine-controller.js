'use strict';

module.exports = ({ strapi }) => ({
  createJob: async ctx => {
    strapi.log.info('ENTER createJob');
    const queue = strapi
      .plugin('nft-engine')
      .bull.queue;

    const data =  await queue.add('mint-nft', { color: 'pink' });

    strapi.log.info('EXIT createJob');
    return JSON.stringify(data);
  },
  mintNFTJob: async job => {
    strapi.log.info('ENTER mintNFTJob');

    strapi.log.debug(JSON.stringify(job));

    if(job.attemptsMade < 20) {
      throw new Error('Something went wrong');
    }
    strapi.log.info('EXIT mintNFTJob');
    // Do something with job
    return 'some value';
  },
  mintNFTJobCompleted: async (job, returnValue) => {
    strapi.log.info('ENTER mintNFTJobCompleted');
    strapi.log.debug(JSON.stringify(job));
    strapi.log.debug(JSON.stringify(returnValue));
    strapi.log.info('EXIT mintNFTJobCompleted');
  },
  mintNFTJobProgress: async (job, progress) => {
    strapi.log.info('ENTER mintNFTJobProgress');
    strapi.log.debug(JSON.stringify(job));
    strapi.log.debug(JSON.stringify(progress));
    strapi.log.info('EXIT mintNFTJobProgress');
  },
  mintNFTJobFailed: async (job, failedReason) => {
    strapi.log.info('ENTER mintNFTJobFailed');
    strapi.log.debug(JSON.stringify(job.attemptsMade));
    strapi.log.debug(JSON.stringify(failedReason));
    // strapi.log.info('EXIT mintNFTJobFailed');
  }
});

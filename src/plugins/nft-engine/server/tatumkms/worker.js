'use strict';
const Path = require('path');
const { Worker, Queue, QueueScheduler } = require('bullmq');
const { processSignatures } = require('@balmacefa/tatum-kms/dist/signatures');
const axios = require('axios');
const http = require('http');
const https = require('https');
const { writeFileSync } = require('fs');


// queueRepeatable
// Create Worker for queueNameRepeatable
const queueNameRepeatable = 'mint-nft-queue-Repeatable';

async function runTatumKMSWorker(strapi, connection, mint_nft_queue) {

  const queueRepeatable = new Queue(queueNameRepeatable, { connection });
  // this is to retry when the job fails
  const qsRepeatable = new QueueScheduler(queueNameRepeatable, { connection });


  const tatum_use_test_net = strapi.config.get('server.tatum.TATUM_USE_TEST_NET');

  const testNetData = {
    path: Path.resolve(__dirname, `db/wallet_test.wallz`),
    pwd: strapi.config.get('server.tatum.TATUM_KMS_PASSWORD_TEST')
  };

  const mainNetData = {
    path: Path.resolve(__dirname, `db/wallet_prod.wallz`),
    pwd: strapi.config.get('server.tatum.TATUM_KMS_PASSWORD_PROD')
  };

  const chains = strapi.config.get('server.tatum.blockchains.list');

  const axiosInstance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true })
  });

  const worker = new Worker(queueNameRepeatable,
    async (job) => {
      let returnMsg = 'Tick tatum transactions';
      const count = await mint_nft_queue.count();
      if (count === 0) {
        returnMsg = 'nft-engine: mint_nft_queue queue is empty';
        return returnMsg;
      }

      let config;

      if (job.data.tatum_use_test_net === false) {
        config = mainNetData;
        process.env.TATUM_API_KEY = strapi.config.get('server.tatum.TATUM_API_KEY_MAINNET');
        returnMsg = 'nft-engine: Tatum KMS: mainnet';
      } else {
        config = testNetData;
        process.env.TATUM_API_KEY = strapi.config.get('server.tatum.TATUM_API_KEY_TESTNET');
        returnMsg = 'nft-engine: Tatum KMS: testnet';
      }

      await processSignatures(config.pwd, tatum_use_test_net, axiosInstance, config.path, chains);
      return returnMsg;
    },
    {
      connection
    }
  );

  worker.on('completed', (job, returnValue) => strapi.log.info('Job completed with return value: ' + returnValue));
  worker.on('progress', (job, progress) => strapi.log.info('Job progress: ' + progress));
  worker.on('failed', (job, failedReason) => strapi.log.info('Job failed: ' + failedReason));
  worker.on('error', err => {
    strapi.log.error("Worker error: \n" + JSON.stringify(err));
    strapi.log.error("Worker error: restarting worker ???????????????????????!!!!!!!!!!!!!!!!");
  });


  const dataTestnet = await queueRepeatable.add('unique_tatum_KMS_job',
    {
      // jobData
      tatum_use_test_net: true
    },
    {
      repeat: {
        every: 6000, // ms -> 1s = 1000ms
      },
      removeOnComplete: true,
      removeOnFail: true,
      jobId: 'UNIQUE_TATUM_KMS_JOB_ID__TESTNET',
    },
  );

  const dataMainnet = await queueRepeatable.add('unique_tatum_KMS_job',
    {
      // jobData
      tatum_use_test_net: false
    },
    {
      repeat: {
        every: 6000, // ms -> 1s = 1000ms
      },
      removeOnComplete: true,
      removeOnFail: true,
      jobId: 'UNIQUE_TATUM_KMS_JOB_ID__MAINNET',
    },
  );

  strapi.log.info(`Job Created: \n ${JSON.stringify(dataTestnet)}`);
  strapi.log.info(`Job Created: \n ${JSON.stringify(dataMainnet)}`);

  return worker;

}




module.exports = {
  runTatumKMSWorker
};

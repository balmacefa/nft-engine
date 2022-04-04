'use strict';
const Path = require('path');
const { Worker, Queue, QueueScheduler } = require('bullmq');
const { processSignatures } = require('@balmacefa/tatum-kms/dist/signatures');
const axios = require('axios');
const http = require('http');
const https = require('https');


// queueRepeatable
// Create Worker for queueNameRepeatable
const queueNameRepeatable = 'mint-nft-queue-Repeatable';

async function runTatumKMSWorker(strapi, connection) {

  const queueRepeatable = new Queue(queueNameRepeatable, { connection });
  // this is to retry when the job fails
  const qsRepeatable = new QueueScheduler(queueNameRepeatable, { connection });


  const tatum_use_test_net = strapi.config.get('server.tatum.TATUM_USE_TEST_NET');
  const path = Path.resolve(__dirname, `db/wallet${tatum_use_test_net ? '_test' : '_prod'}.dat`);

  const pwd = strapi.config.get('server.tatum.TATUM_KMS_PASSWORD');
  const chains = ["MATIC"];

  const axiosInstance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true })
  });

  const worker = new Worker(queueNameRepeatable,
    async (job) => {
      // Call Tatum and tick transactions
      strapi.log.info(`RUNNING processSignatures ---------- JOB`);
      await processSignatures(pwd, tatum_use_test_net, axiosInstance, path, chains);
      strapi.log.info(`EXIT processSignatures ---------- JOB`);
      return true;
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


  const data = await queueRepeatable.add('unique_tatum_KMS_job',
    {
      // jobData
    },
    {
      repeat: {
        every: 5000, // 5 second
      },
      removeOnComplete: true,
      removeOnFail: true,
      jobId: 'UNIQUE_TATUM_KMS_JOB_ID',
    },
  );

  strapi.log.info(`Job Created: \n ${JSON.stringify(data)}`);

  return worker;

}




module.exports = {
  runTatumKMSWorker
};

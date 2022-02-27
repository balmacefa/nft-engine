'use strict';
const axios = require('axios');

// http
const http = require('http');
const https = require('https');
const axiosRetry = require('axios-retry');
const { isNetworkOrIdempotentRequestError } = require('axios-retry');

// generate Axios
module.exports = {
  getAxiosInstance: (config, retryCB) => {
    const instance = axios.create(
      {
        ...config.axiosConfig,
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true })
      }
    );

    // In case of 429 Too Many Requests response error, request is triggered again
    const retryCondition = config.axiosRetry.statusCodes
    axiosRetry(instance, {
      retryDelay: () => config.axiosRetry.retryDelay,
      retries: config.axiosRetry.retries,
      retryCondition: async (error) => {
        let r;
        if (_.isFunction(retryCB)) {
          r = await retryCB(error);
        }
        (error) => isNetworkOrIdempotentRequestError(error)
          || _.includes(retryCondition, error?.response?.status) || r
      }
    });
    return instance;
  },
};

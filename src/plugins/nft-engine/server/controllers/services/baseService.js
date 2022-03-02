'use strict';
const axios = require('axios');

// http
const http = require('http');
const https = require('https');

// generate Axios
module.exports = {
  getAxiosInstance: (config,
    {
      responseInterceptor = (response) => response,
      responseInterceptorError = (error) => Promise.reject(error),

      requestInterceptor = (config) => config,
      requestInterceptorError = (error) => Promise.reject(error)
    }) => {
    const instance = axios.create(
      {
        ...config.axiosConfig,
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true })
      }
    );

    // add interceptors to retry
    instance.interceptors.response.use(responseInterceptor, responseInterceptorError);
    instance.interceptors.response.use(requestInterceptor, requestInterceptorError);

    // // In case of 429 Too Many Requests response error, request is triggered again
    // axiosRetry(instance, {
    //   retryDelay: () => config.axiosRetry.retryDelay,
    //   retries: config.axiosRetry.retries,
    //   retryCondition: async (error) => {
    //     let r;
    //     if (_.isFunction(retryCB)) {
    //       r = await retryCB(error);
    //     }
    //     return isNetworkOrIdempotentRequestError(error) || r
    //   }
    // });
    return instance;
  },
};

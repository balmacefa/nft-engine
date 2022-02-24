const CacheKey = require('../../../utils/CacheKeys.js');

module.exports = {
    afterCreate(event) {
        const { result } = event;
        const key = CacheKey.countRemainMints(result?.user?.id);
        strapi.log.debug('removing cache for key: ' + key);
        strapi.plugin('nft-engine').redisCacheDelKey(key);
    },
    afterUpdate(event) {
        const { result } = event;
        const key = CacheKey.countRemainMints(result?.user?.id);
        strapi.log.debug('removing cache for key: ' + key);
        strapi.plugin('nft-engine').redisCacheDelKey(key);
    },
};
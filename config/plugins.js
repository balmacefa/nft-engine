module.exports = ({ env }) => ({
  'nft-engine': {
    enabled: true,
    resolve: './src/plugins/nft-engine'
  },
  'upload': {
    enabled: true,
    config: {
      provider: 'local',
      providerOptions: {
        sizeLimit: 209715200, //200mb
      },
    },
  },
});

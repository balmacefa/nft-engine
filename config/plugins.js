module.exports = ({ env }) => ({
  'nft-engine': {
    enabled: true,
    resolve: './src/plugins/nft-engine'
  },
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET')
    }
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

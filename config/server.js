module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '0c102b187b3d9e4acb87c55f2d261674'),
    },
  },
  watchIgnoreFiles: [
    '**/config-sync/files/**',
  ],
  url: env('PUBLIC_URL', 'http://localhost:1337')
});

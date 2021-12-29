module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'a891e4c1a7f0766ea9a5421eb8b20a07'),
  },
});

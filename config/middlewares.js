module.exports = [
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  // 'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      "enabled": true,
      "multipart": true,
      "includeUnparsed": true
    },
  },
  'strapi::favicon',
  'strapi::public'
];

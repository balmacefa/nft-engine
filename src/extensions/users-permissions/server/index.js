
'use strict';

const register = require('@strapi/plugin-users-permissions/server/register');
const middlewares = require('@strapi/plugin-users-permissions/server/middlewares');
const routes = require('@strapi/plugin-users-permissions/server/routes');
const controllers = require('@strapi/plugin-users-permissions/server/controllers');
const config = require('@strapi/plugin-users-permissions/server/config');

const bootstrap = require('./bootstrap');
const services = require('./services');
const contentTypes = require('./content-types');

module.exports = () => ({
  register,
  bootstrap,
  config,
  routes,
  controllers,
  contentTypes,
  middlewares,
  services,
});
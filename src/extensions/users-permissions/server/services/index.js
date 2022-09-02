'use strict';

const jwt = require('@strapi/plugin-users-permissions/server/services/jwt');
const user = require('@strapi/plugin-users-permissions/server/services/user');
const role = require('@strapi/plugin-users-permissions/server/services/role');
const usersPermissions = require('@strapi/plugin-users-permissions/server/services/users-permissions');
const providers = require('./providers');

module.exports = {
  jwt,
  providers,
  role,
  user,
  'users-permissions': usersPermissions,
};
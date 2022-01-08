'use strict';

module.exports = {
    type: 'content-api',
    routes: [
        {
            method: 'GET',
            path: '/',
            handler: 'engineController.createJob',
            config: {
                policies: [],
            },
        },
    ],
};

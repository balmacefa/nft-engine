'use strict';

module.exports = {
    type: 'content-api',
    routes: [
        {
            method: 'GET',
            path: '/',
            handler: 'myController.index',
            config: {
                policies: [],
            },
        },
    ],
};

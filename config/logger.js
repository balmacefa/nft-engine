'use strict';

const {
    winston,
    formats: { prettyPrint, levelFilter },
} = require('@strapi/logger');

const Sentry = require('winston-sentry');
const tracer = require('winston-tracer');

module.exports = ({ env }) => ({
    transports: [
        new winston.transports.Console({
            level: 'http',
            format: winston.format.combine(
                winston.format.errors({ stack: true }), // <-- use errors format
                winston.format.colorize(),
                levelFilter('http'),
                prettyPrint({ timestamps: 'YYYY-MM-DD hh:mm:ss.SSS' }),
            ),
        }),
        new Sentry({
            level: 'http',
            dsn: env('SENTRY_DSN', null),
            tags: { key: 'value' },
            // extra: { key: 'value' }
        }),

        new (tracer.winston.transports.Console)({
            level: 'http', // that is important to let winston know about tracing tag
            colorize: true,
            prettyPrint: true,
            timestamp: true
        })

    ],
});

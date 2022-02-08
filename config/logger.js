'use strict';

const {
    winston,
    formats: { prettyPrint, levelFilter },
} = require('@strapi/logger');

module.exports = {
    transports: [
        new winston.transports.Console({
            level: 'http',
            format: winston.format.combine(
                winston.format.label({ label: 'right meow!' }),
                levelFilter('http'),
                prettyPrint({ timestamps: 'YYYY-MM-DD hh:mm:ss.SSS' })
            ),
        }),
    ],
};

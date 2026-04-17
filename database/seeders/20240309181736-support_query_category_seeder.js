'use strict';
const {v4: uuidv4} = require("uuid");

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('support_query_categories', [
            {id: uuidv4(), name: 'PowerOrService'},
            {id: uuidv4(), name: 'ReportsAndPerformanceMeasurement'},
            {id: uuidv4(), name: 'PaymentAndInvoicing'},
            {id: uuidv4(), name: 'Other'}
        ], {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('support_query_categories', null, {});
    }
};

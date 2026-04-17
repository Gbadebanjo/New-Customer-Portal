'use strict';
const {v4: uuidv4} = require("uuid");

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('support_query_statuses', [
            {id: uuidv4(), name: 'New'},
            {id: uuidv4(), name: 'Active'},
            {id: uuidv4(), name: 'Resolved'},
            {id: uuidv4(), name: 'Reopened'}
        ], {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('support_query_statuses', null, {});
    }
};

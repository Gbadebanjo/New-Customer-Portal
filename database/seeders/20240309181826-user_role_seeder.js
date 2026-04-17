'use strict';
const { v4: uuidv4 } = require("uuid");

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('user_roles', [
            {
                id: uuidv4(),
                name: 'Admin',
                normalized_name: 'ADMIN',
                btn_tags: [ 'Public'],
            },
            {
                id: uuidv4(),
                name: 'Daystar Portal Admin',
                normalized_name: 'DAYSTAR PORTAL ADMIN',
                btn_tags: [ 'Public'],            },
            {
                id: uuidv4(),
                name: 'Daystar Customer Admin',
                normalized_name: 'DAYSTAR CUSTOMER ADMIN',
                btn_tags: [ 'Public'],            },
            {
                id: uuidv4(),
                name: 'Customer User',
                normalized_name: 'CUSTOMER USER',
                btn_tags: [ 'Default', 'Public'],            }
        ], {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('user_roles', null, {});
    }
};

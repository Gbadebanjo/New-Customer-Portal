'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('support_queries', 'customer', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '' // Provide a default for existing rows
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('support_queries', 'customer');
  }
};

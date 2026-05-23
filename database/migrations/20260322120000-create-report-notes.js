'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('report_notes', {
      id: {
        allowNull: false,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        type: Sequelize.UUID,
      },
      site_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '',
      },
      report_day: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      report_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      report_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      edited_by: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('report_notes', ['site_id', 'customer_id', 'report_month', 'report_year', 'report_day'], {
      name: 'report_notes_site_customer_month_year_day_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('report_notes');
  },
};
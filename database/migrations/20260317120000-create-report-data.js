'use strict';
const { v4: uuidv4 } = require("uuid");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('report_data', {
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
      report_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      report_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      day: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_daily_consumption: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        defaultValue: 0,
      },
      total_daytime_consumption: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        defaultValue: 0,
      },
      planned_daytime_consumption: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        defaultValue: 0,
      },
      pv_production: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        defaultValue: 0,
      },
      planned_pv_production: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        defaultValue: 0,
      },
      energy_production_turbine: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        defaultValue: 0,
      },
      energy_production_diesel_generator: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        defaultValue: 0,
      },
      daily_daytime_solar_displacement: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '',
      },
      total_solar_displacement: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '',
      },
      data_capture_daytime: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '',
      },
      data_capture_entire_day: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '',
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: '',
      },
      planned_monthly_kwh: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        defaultValue: 0,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add a unique constraint so each day per site/month/year is unique
    await queryInterface.addIndex('report_data', ['site_id', 'report_month', 'report_year', 'day'], {
      unique: true,
      name: 'report_data_site_month_year_day_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('report_data');
  },
};

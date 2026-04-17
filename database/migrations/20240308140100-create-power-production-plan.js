'use strict';
/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('power_production_plans', {
      id: {
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        type: Sequelize.UUID
      },
      file_name: {
        type: Sequelize.STRING
      },
      note: {
        type: Sequelize.STRING
      },
      unique_file_name: {
        type: Sequelize.STRING
      },
      power_production_plan_items: {
        type: Sequelize.ARRAY(Sequelize.JSON),
        allowNull: true,
        defaultValue: null,
      },
      creator_id: {
        type: Sequelize.UUID
      },
      last_modifier_id: {
        type: Sequelize.UUID
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('power_production_plans');
  }
};

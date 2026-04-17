'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('power_production_plan_items', {
      id: {
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        type: Sequelize.UUID
      },
      power_production_plan_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'power_production_plans',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      site_id: {
        type: Sequelize.STRING
      },
      expected_value: {
        type: Sequelize.DOUBLE
      },
      month: {
        type: Sequelize.INTEGER
      },
      year: {
        type: Sequelize.INTEGER
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
    await queryInterface.dropTable('power_production_plan_items');
  }
};
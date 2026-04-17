'use strict';
const {v4: uuidv4} = require("uuid");
const {DataTypes} = require("sequelize");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        allowNull: false,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        type: Sequelize.UUID
      },
      sequence_id: {
        allowNull: false,
        autoIncrement: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      user_name: {
        type: Sequelize.STRING
      },
      correlation_id: {
        type: Sequelize.STRING
      },
      client_ip_address: {
        type: Sequelize.STRING
      },
      url: {
        type: Sequelize.STRING
      },
      has_exception: {
        type: Sequelize.STRING
      },
      duration: {
        type: Sequelize.INTEGER
      },
      http_request: {
        type: Sequelize.STRING
      },
      extra_properties: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable('audit_logs');
  }
};
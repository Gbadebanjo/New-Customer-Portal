'use strict';
const {v4: uuidv4} = require("uuid");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('security_logs', {
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
      application_name: {
        type: Sequelize.STRING
      },
      identity: {
        type: Sequelize.STRING
      },
      action: {
        type: Sequelize.STRING
      },
      user_id: {
        type: Sequelize.STRING
      },
      user_name: {
        type: Sequelize.STRING
      },
      tenant_name: {
        type: Sequelize.STRING
      },
      client_id: {
        type: Sequelize.STRING
      },
      correlation_id: {
        type: Sequelize.STRING
      },
      client_ip_address: {
        type: Sequelize.STRING
      },
      browser_info: {
        type: Sequelize.STRING
      },
      creation_time: {
        type: Sequelize.DATE
      },
      extra_properties: {
        type: Sequelize.STRING
      },
      concurrency_stamp: {
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
    await queryInterface.dropTable('security_logs');
  }
};
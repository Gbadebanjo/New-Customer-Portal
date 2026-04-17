'use strict';
const { v4: uuidv4 } = require("uuid");
/** @type {import('sequelize-cli').migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        type: Sequelize.UUID
      },
      username: {
        type: Sequelize.STRING,
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
      },
      phone_number: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      surname: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ammp_api_key: {
        type: Sequelize.STRING
      },
      customer: {
        type: Sequelize.STRING
      },
      roles: {
        type: Sequelize.ARRAY(Sequelize.JSON),
        allowNull: true,
        defaultValue: null,
      },
      timezone: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      is_locked_out: {
        type: Sequelize.BOOLEAN
      },
      not_active: {
        type: Sequelize.BOOLEAN
      },
      email_confirmed: {
        type: Sequelize.BOOLEAN
      },
      is_external: {
        type: Sequelize.BOOLEAN
      },
      creation_time: {
        type: Sequelize.DATE
      },
      modification_time: {
        type: Sequelize.DATE
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
    await queryInterface.dropTable('users');
  }
};

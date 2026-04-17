'use strict';
const {v4: uuidv4} = require("uuid");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('siteDetails', {
      id: {
        allowNull: false,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        type: Sequelize.UUID
      },
      siteId: {
        type: Sequelize.STRING
      },
      year: {
        type: Sequelize.INTEGER
      },
      january: {
        type: Sequelize.DOUBLE
      },
      february: {
        type: Sequelize.DOUBLE
      },
      march: {
        type: Sequelize.DOUBLE
      },
      april: {
        type: Sequelize.DOUBLE
      },
      may: {
        type: Sequelize.DOUBLE
      },
      june: {
        type: Sequelize.DOUBLE
      },
      july: {
        type: Sequelize.DOUBLE
      },
      august: {
        type: Sequelize.DOUBLE
      },
      september: {
        type: Sequelize.DOUBLE
      },
      october: {
        type: Sequelize.DOUBLE
      },
      november: {
        type: Sequelize.DOUBLE
      },
      december: {
        type: Sequelize.DOUBLE
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
    await queryInterface.dropTable('siteDetails');
  }
};
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Notes default to customer-visible — that's the point of the corrections
    // log. NOC can uncheck for internal-only remarks.
    await queryInterface.addColumn('report_notes', 'visible_to_customer', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('report_notes', 'visible_to_customer');
  },
};

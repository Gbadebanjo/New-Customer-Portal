'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Data assurance columns. New rows land as 'raw' (populated by ingestion
    // or created empty by NOC). NOC "Verify" flips to 'verified' and stamps
    // who and when. raw_source_data holds the untouched provider snapshot
    // so the NOC screen can show original vs current side by side.
    await queryInterface.addColumn('report_data', 'status', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'raw',
    });
    await queryInterface.addColumn('report_data', 'raw_source_data', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('report_data', 'verified_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('report_data', 'verified_by_user_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addIndex('report_data', ['status'], {
      name: 'report_data_status_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('report_data', 'report_data_status_idx');
    await queryInterface.removeColumn('report_data', 'verified_by_user_id');
    await queryInterface.removeColumn('report_data', 'verified_at');
    await queryInterface.removeColumn('report_data', 'raw_source_data');
    await queryInterface.removeColumn('report_data', 'status');
  },
};

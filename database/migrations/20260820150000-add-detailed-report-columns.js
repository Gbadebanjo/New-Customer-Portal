'use strict';

// Adds the six columns that Hybrid / BESS sites need on the daily
// report but that Solar-only sites leave null. All nullable so
// existing rows are unaffected — the report editor decides which
// columns to render per-site via the central column config + the
// operator's per-site visibility toggle.
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('report_data', 'energy_from_grid', {
            type: Sequelize.DOUBLE, allowNull: true,
        });
        await queryInterface.addColumn('report_data', 'actual_yield_lv', {
            type: Sequelize.DOUBLE, allowNull: true,
        });
        await queryInterface.addColumn('report_data', 'daily_totalizer_pv_reading', {
            type: Sequelize.DOUBLE, allowNull: true,
        });
        await queryInterface.addColumn('report_data', 'power_from_generator_to_charge_bess', {
            type: Sequelize.DOUBLE, allowNull: true,
        });
        await queryInterface.addColumn('report_data', 'auxiliary_consumption', {
            type: Sequelize.DOUBLE, allowNull: true,
        });
        await queryInterface.addColumn('report_data', 'auxiliary_consumption_operator_room', {
            type: Sequelize.DOUBLE, allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('report_data', 'auxiliary_consumption_operator_room');
        await queryInterface.removeColumn('report_data', 'auxiliary_consumption');
        await queryInterface.removeColumn('report_data', 'power_from_generator_to_charge_bess');
        await queryInterface.removeColumn('report_data', 'daily_totalizer_pv_reading');
        await queryInterface.removeColumn('report_data', 'actual_yield_lv');
        await queryInterface.removeColumn('report_data', 'energy_from_grid');
    },
};

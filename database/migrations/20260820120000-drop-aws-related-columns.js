'use strict';

// AWS/S3 has been fully removed from the app. Two columns that only
// existed to reference S3 objects are dead weight and are dropped:
//
//   - customers.logo_file_name          — orphan (customer logo feature never worked end-to-end)
//   - power_production_plans.unique_file_name — S3 key of the uploaded xlsx (no longer uploaded)
//
// down() re-adds them nullable so a rollback is non-destructive.
module.exports = {
    async up(queryInterface) {
        await queryInterface.removeColumn('customers', 'logo_file_name');
        await queryInterface.removeColumn('power_production_plans', 'unique_file_name');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn('customers', 'logo_file_name', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('power_production_plans', 'unique_file_name', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },
};

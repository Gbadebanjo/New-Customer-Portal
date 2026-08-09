'use strict';

// Drops two tables and their supporting code was unreferenced by any
// live page or component:
//
//  - `reports`      — wrapper around a per-file "report" concept that
//                     was never wired to the UI. `report_data` (the
//                     daily numbers) and `report_notes` are separate
//                     and remain in use.
//  - `siteDetails`  — monthly-yield-by-month table. The model even had
//                     `tableName: 'site_details'`, mismatching the
//                     actual DB name — every model call would have
//                     silently failed anyway.
//
// Down migration recreates both with the same shape so this is
// reversible if anything downstream turns out to have referenced them.

module.exports = {
    async up(queryInterface) {
        await queryInterface.dropTable('reports');
        // Table name is quoted-camelCase in the DB.
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS "siteDetails"');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.createTable('reports', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: { type: Sequelize.STRING, allowNull: false },
            file_name: { type: Sequelize.STRING, allowNull: false },
            site_id: { type: Sequelize.STRING, allowNull: false },
            concurrency_stamp: { type: Sequelize.STRING, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        });

        await queryInterface.sequelize.query(`
            CREATE TABLE "siteDetails" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                site_id VARCHAR NOT NULL,
                year INTEGER NOT NULL,
                january DOUBLE PRECISION NOT NULL,
                february DOUBLE PRECISION NOT NULL,
                march DOUBLE PRECISION NOT NULL,
                april DOUBLE PRECISION NOT NULL,
                may DOUBLE PRECISION NOT NULL,
                june DOUBLE PRECISION NOT NULL,
                july DOUBLE PRECISION NOT NULL,
                august DOUBLE PRECISION NOT NULL,
                september DOUBLE PRECISION NOT NULL,
                october DOUBLE PRECISION NOT NULL,
                november DOUBLE PRECISION NOT NULL,
                december DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            )
        `);
    },
};

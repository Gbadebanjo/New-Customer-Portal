'use strict';

// Per-user, per-site preference for which optional report columns are
// visible in the editor. Small table — one row per (user, site) combo
// that has an explicit override; sites without a row fall back to the
// site-type default derived from `deriveSiteType()`.
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('report_column_prefs', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            site_id: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            visible_columns: {
                // Array of column ids (strings) that should be shown in
                // the editor for this (user, site) pairing.
                type: Sequelize.JSONB,
                allowNull: false,
                defaultValue: [],
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // One row per (user, site) combo — upserts key off this.
        await queryInterface.addIndex('report_column_prefs', {
            fields: ['user_id', 'site_id'],
            unique: true,
            name: 'report_column_prefs_user_site_unique',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('report_column_prefs');
    },
};

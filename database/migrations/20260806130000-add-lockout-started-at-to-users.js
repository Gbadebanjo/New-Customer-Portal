'use strict';

// Adds `lockout_started_at` so we can recompute the unlock time from
// `lockout_started_at + admin_duration` at every login check. This makes
// the admin's configured duration authoritative — dropping the setting
// from 60 min → 15 min immediately shortens every in-flight lock; raising
// it lengthens them, all without persisting a stale absolute timestamp.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'lockout_started_at', {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('users', 'lockout_started_at');
    },
};

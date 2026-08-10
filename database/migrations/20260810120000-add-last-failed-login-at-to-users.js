'use strict';

// Adds `last_failed_login_at` so the login flow can implement a
// sliding-window failure counter: each new failed attempt whose
// timestamp is older than the admin's `lockoutDurationMinutes` window
// (relative to the previous failed attempt) resets the counter to 1
// before incrementing. Legitimate users who fumble once, then again
// hours later, no longer accumulate a lockout across unrelated
// sessions — but a genuine burst of failures within the window still
// trips the lock.
//
// Backfill isn't needed: existing rows land as NULL, which the login
// flow treats as "no recent failure" → first future failure starts
// the window fresh.

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'last_failed_login_at', {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: null,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('users', 'last_failed_login_at');
    },
};

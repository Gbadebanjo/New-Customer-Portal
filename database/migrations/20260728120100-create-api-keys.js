'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
      id: {
        allowNull: false,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        type: Sequelize.UUID,
      },
      // SHA-256 hash of the raw key. Never store raw keys — only shown once
      // at generation and never persisted in the clear.
      key_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      // First 8 chars of the raw key so admins can identify a row without
      // seeing the secret. Purely for display, has no auth value on its own.
      key_prefix: {
        type: Sequelize.STRING(16),
        allowNull: false,
      },
      // Human label — e.g. "NBC production", "Internal analytics pipeline".
      label: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      // Null customer_id = fleet-wide (internal use). Non-null = scoped to
      // one customer for external distribution.
      customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // Explicit scope stored for filtering; must match the customer_id
      // presence rule above. 'customer' or 'fleet'.
      scope: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'customer',
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Lookup on every public API request — must be fast.
    await queryInterface.addIndex('api_keys', ['key_hash'], {
      name: 'api_keys_key_hash_idx',
    });
    await queryInterface.addIndex('api_keys', ['customer_id'], {
      name: 'api_keys_customer_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('api_keys');
  },
};

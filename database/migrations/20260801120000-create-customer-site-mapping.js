'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Direct many-to-many between our Customer records and AMMP asset ids.
    // Under the master-key model this table replaces AMMP's own key-scoping
    // for authorization — every AMMP fetch is filtered by these rows.
    //
    // Rows can be created by:
    //   - the nightly `asset_groups` sync (source='group_sync')
    //   - an admin adding a single site manually (source='manual')
    //   - the "Refresh from source" button on the reports screen (source='refresh')
    await queryInterface.createTable('customer_site_mapping', {
      id: {
        allowNull: false,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        type: Sequelize.UUID,
      },
      customer_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      asset_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      // Where the row came from — helps future syncs know what's safe to prune.
      source: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'group_sync',
      },
      // The AMMP group id/name we inferred this mapping from, when applicable.
      source_ref: {
        type: Sequelize.STRING,
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

    await queryInterface.addIndex('customer_site_mapping', ['customer_id'], {
      name: 'customer_site_mapping_customer_idx',
    });
    await queryInterface.addIndex('customer_site_mapping', ['asset_id'], {
      name: 'customer_site_mapping_asset_idx',
    });
    // Enforce one mapping per (customer, site) pair.
    await queryInterface.addIndex('customer_site_mapping', ['customer_id', 'asset_id'], {
      name: 'customer_site_mapping_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('customer_site_mapping');
  },
};

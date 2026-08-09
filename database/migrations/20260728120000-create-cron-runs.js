'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cron_runs', {
      id: {
        allowNull: false,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        type: Sequelize.UUID,
      },
      // Which cron this run belongs to (e.g. 'ingest_daily', 'notify_reports').
      // Kept as a plain string so new crons don't need a migration.
      kind: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // 'running' during execution, 'ok' or 'failed' on completion.
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'running',
      },
      // Per-run stats returned by the cron (JSON blob so we don't have to
      // add columns every time a cron reports a new metric).
      summary: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      error_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // Optional identifier of who triggered it manually. Null for scheduled runs.
      triggered_by_user_id: {
        type: Sequelize.UUID,
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

    await queryInterface.addIndex('cron_runs', ['kind', 'started_at'], {
      name: 'cron_runs_kind_started_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cron_runs');
  },
};

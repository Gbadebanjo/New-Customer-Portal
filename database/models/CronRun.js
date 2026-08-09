'use strict';
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class CronRun extends Model {}

CronRun.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
    allowNull: false,
  },
  kind: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  finished_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'running',
  },
  summary: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  error_text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  triggered_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'cron_runs',
  modelName: 'CronRun',
  underscored: true,
});

export default CronRun;

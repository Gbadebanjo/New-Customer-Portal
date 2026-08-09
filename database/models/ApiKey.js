'use strict';
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class ApiKey extends Model {}

ApiKey.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
    allowNull: false,
  },
  key_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
  },
  key_prefix: {
    type: DataTypes.STRING(16),
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  // customer_id is a plain string (matches the pattern used in ReportData /
  // ReportNote — these are the customer's short id).
  customer_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  scope: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'customer',
  },
  created_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'api_keys',
  modelName: 'ApiKey',
  underscored: true,
});

export default ApiKey;

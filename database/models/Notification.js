'use strict';
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class Notification extends Model {}

Notification.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // e.g. 'report_ready' | 'ticket_update' | 'site_offline'. Kept as a plain
  // string so new kinds can be added without a migration.
  kind: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Deep link into the portal, e.g. '/reports?site=X&month=8&year=2026'.
  href: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'notifications',
  modelName: 'Notification',
  underscored: true,
});

export default Notification;

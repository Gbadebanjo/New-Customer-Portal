'use strict';
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class CustomerSiteMapping extends Model {}

CustomerSiteMapping.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
    allowNull: false,
  },
  customer_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  asset_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  source: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'group_sync',
  },
  source_ref: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'customer_site_mapping',
  modelName: 'CustomerSiteMapping',
  underscored: true,
});

export default CustomerSiteMapping;

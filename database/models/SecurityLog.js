'use strict';
import { DataTypes, Model } from "sequelize";
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class SecurityLogs extends Model {
  // static associate(models) {
  //   // define association here
  // }
}

SecurityLogs.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  sequence_id: DataTypes.INTEGER,
  application_name: DataTypes.STRING,
  identity: DataTypes.STRING,
  action: DataTypes.STRING,
  user_id: DataTypes.STRING,
  user_name: DataTypes.STRING,
  tenant_name: DataTypes.STRING,
  client_id: DataTypes.STRING,
  correlation_id: DataTypes.STRING,
  client_ip_address: DataTypes.STRING,
  browser_info: DataTypes.STRING,
  creation_time: DataTypes.DATE,
  extra_properties: DataTypes.STRING,
  concurrency_stamp: DataTypes.STRING
}, {
  tableName: "security_logs",
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  underscored: true,
  modelName: 'SecurityLogs',
});

export default SecurityLogs;
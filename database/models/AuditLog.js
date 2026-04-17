'use strict';
import { DataTypes, Model } from "sequelize";
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class AuditLog extends Model {
  // static associate(models) {
  //   // define association here
  // }
}

AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  sequence_id: DataTypes.INTEGER,
  name: DataTypes.STRING,
  user_name: DataTypes.STRING,
  correlation_id: DataTypes.STRING,
  client_ip_address: DataTypes.STRING,
  url: DataTypes.STRING,
  has_exception: DataTypes.STRING,
  duration: DataTypes.INTEGER,
  http_request: DataTypes.STRING,
  extra_properties: DataTypes.STRING
}, {
  tableName: "audit_logs",
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  underscored: true,
  modelName: 'AuditLog',
});

export default AuditLog;
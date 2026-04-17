'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection'; // for db use by application

class SupportQueryStatus extends Model {
  // static associate(models) {
  //   // Define associations here
  // }
}

SupportQueryStatus.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'support_query_statuses',
  modelName: 'SupportQueryStatus',
  underscored: true
});

export default SupportQueryStatus;

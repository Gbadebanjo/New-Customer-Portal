'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class SupportQueryCategory extends Model {
  // static associate(models) {
  //   // Define associations here
  // }
}

SupportQueryCategory.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'support_query_categories',
  modelName: 'SupportQueryCategory',
  underscored: true
});

export default SupportQueryCategory;

'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class UserRole extends Model {
  // static associate(models) {
  //   // define association here
  // }
}

UserRole.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  normalized_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  btn_tags: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'user_roles',
  modelName: 'UserRole',
  underscored: true
});

export default UserRole;

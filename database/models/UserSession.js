'use strict';
import { DataTypes, Model } from 'sequelize';
import sequelizeConnection from '@/db_connection';

class UserSession extends Model {
  // static associate(models) {
  //   // define association here
  // }
}

UserSession.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize: sequelizeConnection,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'user_sessions',
  modelName: 'UserSession',
  underscored: true
});

export default UserSession;

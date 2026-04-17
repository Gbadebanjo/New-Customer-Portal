'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class VerificationCode extends Model {
  // static associate(models) {
  //   // ✅ Use 'this' instead of 'VerificationCode'
  // }
}

VerificationCode.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    unique: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  }
}, {
  sequelize: sequelizeConnection,
  modelName: 'VerificationCode',
  tableName: 'verification_codes',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default VerificationCode;
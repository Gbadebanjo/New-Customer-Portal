'use strict';
import { DataTypes, Model } from "sequelize";
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class VerificationCode extends Model {}

VerificationCode.init({
  id: {
    type: DataTypes.UUID,
    // Function form, not `DataTypes.UUIDV4` — under this Sequelize
    // version the class literal gets serialised as the string 'UUIDV4'
    // when the create call doesn't pass an explicit id, producing
    // `invalid input syntax for type uuid: "UUIDV4"` on insert.
    defaultValue: () => uuidv4(),
    primaryKey: true,
    allowNull: false,
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
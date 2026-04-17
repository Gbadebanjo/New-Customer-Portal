'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class Customer extends Model {
  static associate(models) {
    // define association here
  }
}

Customer.init({
  company_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 255], // Validate length between 1 and 255 characters
    },
  },
  logo_file_name: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 255], // Validate length up to 255 characters
    },
  },
  users: {
    type: DataTypes.ARRAY(DataTypes.JSON),
    allowNull: true,
    defaultValue: null,
  }
}, {
  tableName: "customers",
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  modelName: 'Customer',
  underscored: true
});

export default Customer;

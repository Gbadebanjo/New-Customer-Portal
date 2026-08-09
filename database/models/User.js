'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class User extends Model {
  static associate(models) {
    // this.belongsTo(models.Customer, { foreignKey: 'customer', as: 'company' });
    this.hasMany(models.SupportQuery, { foreignKey: 'user_id', as: 'supportQueries' });
  }
}

User.init({
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  surname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ammp_api_key: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  customer: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  roles: {
    type: DataTypes.ARRAY(DataTypes.JSON),
    allowNull: true,
    defaultValue: null,
  },
  timezone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  is_locked_out: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  not_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  email_confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  is_external: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  creation_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  modification_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  totp_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  totp_secret: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  totp_temp_secret: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  failed_login_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  lockout_until: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  // When the current lockout began. Combined with the admin's current
  // maxLockoutDurationMinutes at check time, this is what determines
  // whether the user is still locked — so admin changes take effect
  // immediately for existing locks.
  lockout_started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'users',
  modelName: 'User',
  underscored: true
});

export default User;

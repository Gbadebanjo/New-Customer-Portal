'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class SiteDetail extends Model {
  // static associate(models) {
  //   // define association here
  // }
}

SiteDetail.init({
  site_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 9999,
    },
  },
  january: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  february: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  march: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  april: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  may: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  june: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  july: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  august: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  september: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  october: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  november: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  december: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'site_details',
  modelName: 'SiteDetail',
  underscored: true
});

export default SiteDetail;
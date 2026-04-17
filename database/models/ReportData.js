'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class ReportData extends Model {}

ReportData.init({
  customer_id: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  site_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  report_month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 12 },
  },
  report_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 2000, max: 9999 },
  },
  day: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 31 },
  },
  total_daily_consumption: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  },
  total_daytime_consumption: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  },
  planned_daytime_consumption: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  },
  pv_production: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  },
  planned_pv_production: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  },
  energy_production_turbine: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  },
  energy_production_diesel_generator: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  },
  daily_daytime_solar_displacement: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  total_solar_displacement: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  data_capture_daytime: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  data_capture_entire_day: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  planned_monthly_kwh: {
    type: DataTypes.DOUBLE,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'report_data',
  modelName: 'ReportData',
  underscored: true,
});

export default ReportData;

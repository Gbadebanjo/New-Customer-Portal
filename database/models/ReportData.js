'use strict';
import { DataTypes, Model } from "sequelize";
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class ReportData extends Model {}

ReportData.init({
  // DB column is uuid NOT NULL with no server default. Function form for
  // the default — the class literal `DataTypes.UUIDV4` serialises to the
  // string 'UUIDV4' at insert time on this Sequelize version.
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
    allowNull: false,
  },
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
  // ── Detailed / Hybrid-site fields — nullable so Solar-only sites
  // simply leave them unset. Auto-shown by the editor when the site's
  // deriveSiteType() is `hybrid` or `battery-only`; otherwise hidden
  // (each is still individually toggleable via the Columns dropdown).
  energy_from_grid: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  actual_yield_lv: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  daily_totalizer_pv_reading: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  power_from_generator_to_charge_bess: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  auxiliary_consumption: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  auxiliary_consumption_operator_room: {
    type: DataTypes.DOUBLE,
    allowNull: true,
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
  // Data-assurance columns. These MUST be declared on the model or
  // Sequelize silently drops them from every `.update()` / `.create()` —
  // which is why admin saves were leaving rows stuck at status='raw'
  // and customers (who only see 'verified') were seeing nothing.
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'raw',
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  verified_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  raw_source_data: {
    type: DataTypes.JSONB,
    allowNull: true,
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

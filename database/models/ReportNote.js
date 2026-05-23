'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class ReportNote extends Model {}

ReportNote.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },
  site_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customer_id: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  report_day: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 31 },
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
  note: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  edited_by: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'report_notes',
  modelName: 'ReportNote',
  underscored: true,
});

export default ReportNote;
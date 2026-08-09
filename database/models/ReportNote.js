'use strict';
import { DataTypes, Model } from "sequelize";
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class ReportNote extends Model {}

ReportNote.init({
  id: {
    type: DataTypes.UUID,
    // Function form; `DataTypes.UUIDV4` literal serialises to the string
    // 'UUIDV4' on insert under this Sequelize version.
    defaultValue: () => uuidv4(),
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
  visible_to_customer: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
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
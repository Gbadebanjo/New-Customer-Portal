'use strict';
import { DataTypes, Model } from "sequelize";
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class PowerProductionPlan extends Model {}

PowerProductionPlan.init({
  id: {
    type: DataTypes.UUID,
    // Function form — `DataTypes.UUIDV4` literal serialises to the string
    // 'UUIDV4' on insert under this Sequelize version.
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: true,
      len: [1, 255], // Validate length between 1 and 255 characters
    },
  },
  note: {
    type: DataTypes.STRING,
    validate: {
      len: [1, 255], // Validate length between 1 and 255 characters
    },
  },
  unique_file_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: true,
      len: [1, 255], // Validate length between 1 and 255 characters
    },
  },
  power_production_plan_items: {
    type: DataTypes.ARRAY(DataTypes.JSON),
    allowNull: true,
    defaultValue: null,
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: true, // Nullable, since creator might be soft deleted
  },
  last_modifier_id: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'power_production_plans',
  modelName: 'PowerProductionPlan',
  underscored: true
});

export default PowerProductionPlan;

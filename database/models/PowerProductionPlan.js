'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class PowerProductionPlan extends Model {
  // static associate(models) {
  //   // define association here
  // }
}

PowerProductionPlan.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
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

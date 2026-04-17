'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class PowerProductionPlanItem extends Model {
  static associate(models) {
    // define association here
  }
}

PowerProductionPlanItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  power_production_plan_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  site_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  expected_value: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12,
    },
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 9999,
    },
  },
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'power_production_plan_items',
  modelName: 'PowerProductionPlanItem',
  underscored: true
});

export default PowerProductionPlanItem;

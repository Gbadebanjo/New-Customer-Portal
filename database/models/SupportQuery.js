'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';
import { SupportQueryConstants } from "@/utils/constants";

class SupportQuery extends Model {
  static associate(models) {
    // ✅ User association
    this.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    this.hasMany(models.SupportQueryMessage, { foreignKey: "support_query_id", as: "messages"});
  }
}

SupportQuery.init({
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: true,
      len: [SupportQueryConstants.TitleMinLength, SupportQueryConstants.TitleMaxLength],
    },
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notNull: true,
      len: [SupportQueryConstants.DescriptionMinLength, SupportQueryConstants.DescriptionMaxLength],
    },
  },
  // support_query_messages: {
  //   type: DataTypes.ARRAY(DataTypes.JSON),
  //   allowNull: true,
  //   defaultValue: null,
  // },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  customer: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  sequelize: sequelizeConnection,
  createdAt: "created_at",
  updatedAt: "updated_at",
  tableName: 'support_queries',
  modelName: 'SupportQuery',
  underscored: true
});

export default SupportQuery;
'use strict';
import { DataTypes, Model } from "sequelize";
import sequelizeConnection from '@/db_connection';

class TextTemplate extends Model {
  // static associate(models) {
  //   // define association here
  // }
}

  TextTemplate.init({
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    display_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    inline_localized: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize: sequelizeConnection,
    createdAt: "created_at",
    updatedAt: "updated_at",
    tableName: 'text_templates',
    modelName: 'TextTemplate',
    underscored: true
  });

export default TextTemplate;
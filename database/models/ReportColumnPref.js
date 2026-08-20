'use strict';
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelizeConnection from '@/db_connection';

class ReportColumnPref extends Model {}

ReportColumnPref.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: () => uuidv4(),
        primaryKey: true,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    site_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // Array of column ids (strings) currently visible in the editor
    // for this (user, site) combo.
    visible_columns: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },
}, {
    sequelize: sequelizeConnection,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'report_column_prefs',
    modelName: 'ReportColumnPref',
    underscored: true,
    indexes: [
        { unique: true, fields: ['user_id', 'site_id'], name: 'report_column_prefs_user_site_unique' },
    ],
});

export default ReportColumnPref;

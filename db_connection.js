import { options } from '@/database/config/config.mjs'
import { Sequelize } from "sequelize";
import pg from "pg";

options.dialectModule = pg;

let sequelizeConnection;

if (process.env.NODE_ENV === 'production') {
  sequelizeConnection = new Sequelize({
    ...options,
    dialect: "postgres",
    dialectModule: pg,
    logging: false,
    pool: {
      max: 5,           // Reduced from 10 - be conservative in production
      min: 0,
      idle: 10000,
      acquire: 30000,
      evict: 10000
    }
  });
} else {
  // Development: use global to prevent hot reload issues
  if (!global._sequelizeConnection) {
    global._sequelizeConnection = new Sequelize({
      ...options,
      dialect: "postgres",
      dialectModule: pg,
      logging: false,
      pool: {
        max: 2,         // Much lower for development (hot reloads)
        min: 0,
        idle: 3000,     // Release faster in dev
        acquire: 30000,
        evict: 3000     // Evict faster in dev
      }
    });
    console.log("✅ Sequelize connection created (dev)");
  }
  sequelizeConnection = global._sequelizeConnection;
}
// Connection event listeners for debugging
sequelizeConnection.authenticate()
  .then(() => console.log('✅ Database connection established'))
  .catch(err => console.error('❌ Unable to connect to database:', err));

export default sequelizeConnection;
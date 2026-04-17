import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error) {
    console.error('Error loading .env file:', result.error);
}

export const options = {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    logging: process.env.NODE_ENV==="development" ? console.log : false,
    migrationStorageTableName: "migrations",
    dialect: "postgres"
  }


if(process.env.NODE_ENV=== "production"){
    options.dialectOptions = {
        ssl: {
            rejectUnauthorized: true,
        }
    }
}

export default {
    development: options,
    test: options,
    production: options,
};

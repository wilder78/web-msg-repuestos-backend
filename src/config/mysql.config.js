import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const dbHost =
  !process.env.DB_HOST || process.env.DB_HOST === "localhost"
    ? "127.0.0.1"
    : process.env.DB_HOST;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: dbHost,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      connectTimeout: 10000,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

export default sequelize;



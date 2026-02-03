import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres_dev_password',
  database: process.env.DB_DATABASE || 'pettoyou',
  entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../../database/migrations/*{.ts,.js}')],
  synchronize: false, // ⚠️ Disabled - use manual migration
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
  } : false,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

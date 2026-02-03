/**
 * Database Seeder
 * Run: npm run seed
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { HospitalSeeder } from './hospital-seeder';

async function bootstrap() {
  console.log('🌱 Starting database seeding...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Seed hospitals
    const hospitalSeeder = app.get(HospitalSeeder);
    await hospitalSeeder.run();

    console.log('\n✅ All seeds completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

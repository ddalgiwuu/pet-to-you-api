/**
 * Master Seed Runner
 * Orchestrates all database seeding operations
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { BreedSeeder } from './breed-seeder';
import { CatBreedSeeder } from './cat-breed-seeder';
import { HospitalSeeder } from './hospital-seeder';

async function bootstrap() {
  console.log('🌱 Pet to You - Database Seeding\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const startTime = Date.now();

    // 1. Seed dog breeds (no dependencies)
    console.log('1️⃣  Seeding dog breeds...');
    const breedSeeder = app.get(BreedSeeder);
    await breedSeeder.run();

    // 2. Seed cat breeds (no dependencies)
    console.log('\n2️⃣  Seeding cat breeds...');
    const catBreedSeeder = app.get(CatBreedSeeder);
    await catBreedSeeder.run();

    // 3. Seed hospitals (no dependencies)
    console.log('\n3️⃣  Seeding hospitals...');
    const hospitalSeeder = app.get(HospitalSeeder);
    await hospitalSeeder.run();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✨ All seeds completed successfully in ${duration}s!\n`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();

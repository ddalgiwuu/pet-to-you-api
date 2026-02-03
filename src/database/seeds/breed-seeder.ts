/**
 * Dog Breed Seeder
 * Seeds 300+ dog breeds from CSV data
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DogBreed } from '../../modules/pets/entities/dog-breed.entity';
import { BreedCsvParser } from '../parsers/breed-csv-parser';
import * as path from 'path';

@Injectable()
export class BreedSeeder {
  constructor(
    @InjectRepository(DogBreed)
    private readonly breedRepository: Repository<DogBreed>,
  ) {}

  async run(): Promise<void> {
    console.log('\n🐕 Starting dog breed seeding...\n');

    try {
      // Parse CSV file
      const csvPath = path.join(__dirname, '../../../data/견종데이터.csv');
      console.log(`📄 Reading CSV from: ${csvPath}`);

      const parser = new BreedCsvParser();
      const breeds = await parser.parse(csvPath);

      // Clear existing data
      console.log('🗑️  Clearing existing dog breeds...');
      await this.breedRepository.clear();

      // Insert all breeds in a single batch
      console.log(`📥 Inserting ${breeds.length} breeds...`);
      await this.breedRepository.save(breeds);

      // Get statistics
      const total = await this.breedRepository.count();
      const popularCount = await this.breedRepository.count({ where: { isPopular: true } });
      const categoryStats = await this.breedRepository
        .createQueryBuilder('breed')
        .select('breed.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .groupBy('breed.category')
        .orderBy('breed.category', 'ASC')
        .getRawMany();

      console.log('\n✨ Dog breed seeding completed!\n');
      console.log(`📊 Statistics:`);
      console.log(`   Total breeds: ${total}`);
      console.log(`   Popular breeds: ${popularCount}`);
      console.log(`   By category:`);

      categoryStats.forEach((stat) => {
        console.log(`     ${stat.category}: ${stat.count}`);
      });

    } catch (error) {
      console.error('❌ Dog breed seeding failed:', error);
      throw error;
    }
  }
}

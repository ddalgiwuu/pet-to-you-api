/**
 * Cat Breed Seeder
 * Seeds cat breeds from CSV data
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatBreed } from '../../modules/pets/entities/cat-breed.entity';
import { CatBreedCsvParser } from '../parsers/cat-breed-csv-parser';
import * as path from 'path';

@Injectable()
export class CatBreedSeeder {
  constructor(
    @InjectRepository(CatBreed)
    private readonly breedRepository: Repository<CatBreed>,
  ) {}

  async run(): Promise<void> {
    console.log('\n🐱 Starting cat breed seeding...\n');

    try {
      const csvPath = path.join(__dirname, '../../../data/고양이품종데이터.csv');
      console.log(`📄 Reading CSV from: ${csvPath}`);

      const parser = new CatBreedCsvParser();
      const breeds = await parser.parse(csvPath);

      console.log('🗑️  Clearing existing cat breeds...');
      await this.breedRepository.clear();

      console.log(`📥 Inserting ${breeds.length} cat breeds...`);
      await this.breedRepository.save(breeds);

      const total = await this.breedRepository.count();
      const popularCount = await this.breedRepository.count({ where: { isPopular: true } });
      const categoryStats = await this.breedRepository
        .createQueryBuilder('breed')
        .select('breed.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .groupBy('breed.category')
        .orderBy('breed.category', 'ASC')
        .getRawMany();

      console.log('\n✨ Cat breed seeding completed!\n');
      console.log(`📊 Statistics:`);
      console.log(`   Total breeds: ${total}`);
      console.log(`   Popular breeds: ${popularCount}`);
      console.log(`   By category:`);

      categoryStats.forEach((stat) => {
        console.log(`     ${stat.category}: ${stat.count}`);
      });
    } catch (error) {
      console.error('❌ Cat breed seeding failed:', error);
      throw error;
    }
  }
}

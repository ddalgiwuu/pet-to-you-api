/**
 * Breed Service
 * Service for managing dog and cat breeds
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { DogBreed } from '../entities/dog-breed.entity';
import { CatBreed } from '../entities/cat-breed.entity';

interface BreedQueryOptions {
  category?: string;
  popular?: boolean;
  search?: string;
}

@Injectable()
export class BreedService {
  constructor(
    @InjectRepository(DogBreed)
    private dogBreedRepository: Repository<DogBreed>,
    @InjectRepository(CatBreed)
    private catBreedRepository: Repository<CatBreed>,
  ) {}

  /**
   * Get dog breeds with filters
   */
  async getDogBreeds(options: BreedQueryOptions) {
    const where: any = {};

    if (options.category) {
      where.category = options.category;
    }

    if (options.popular) {
      where.isPopular = true;
    }

    if (options.search) {
      // Note: ILike for case-insensitive search
      where.nameKorean = ILike(`%${options.search}%`);
    }

    const breeds = await this.dogBreedRepository.find({
      where,
      order: { nameKorean: 'ASC' },
    });

    return {
      success: true,
      data: breeds,
      total: breeds.length,
    };
  }

  /**
   * Get cat breeds with filters
   */
  async getCatBreeds(options: BreedQueryOptions) {
    const where: any = {};

    if (options.category) {
      where.category = options.category;
    }

    if (options.popular) {
      where.isPopular = true;
    }

    if (options.search) {
      where.nameKorean = ILike(`%${options.search}%`);
    }

    const breeds = await this.catBreedRepository.find({
      where,
      order: { nameKorean: 'ASC' },
    });

    return {
      success: true,
      data: breeds,
      total: breeds.length,
    };
  }

  /**
   * Get breed categories with counts
   */
  async getCategories(species: string) {
    const repository = species === 'cat' ? this.catBreedRepository : this.dogBreedRepository;

    const result = await repository
      .createQueryBuilder('breed')
      .select('breed.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('breed.category')
      .orderBy('breed.category', 'ASC')
      .getRawMany();

    return {
      success: true,
      data: result,
    };
  }
}

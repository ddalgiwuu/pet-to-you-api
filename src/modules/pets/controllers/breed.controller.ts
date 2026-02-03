/**
 * Breed Controller
 * Endpoints for dog and cat breed data
 */

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BreedService } from '../services/breed.service';

@ApiTags('breeds')
@Controller('breeds')
export class BreedController {
  constructor(private readonly breedService: BreedService) {}

  /**
   * Get dog breeds
   */
  @Get('dogs')
  @ApiOperation({ summary: '강아지 품종 목록' })
  @ApiResponse({ status: 200, description: 'List of dog breeds' })
  async getDogBreeds(
    @Query('category') category?: string,
    @Query('popular') popular?: string,
    @Query('search') search?: string,
  ) {
    return this.breedService.getDogBreeds({
      category,
      popular: popular === 'true',
      search,
    });
  }

  /**
   * Get cat breeds
   */
  @Get('cats')
  @ApiOperation({ summary: '고양이 품종 목록' })
  @ApiResponse({ status: 200, description: 'List of cat breeds' })
  async getCatBreeds(
    @Query('category') category?: string,
    @Query('popular') popular?: string,
    @Query('search') search?: string,
  ) {
    return this.breedService.getCatBreeds({
      category,
      popular: popular === 'true',
      search,
    });
  }

  /**
   * Get breed categories
   */
  @Get('categories')
  @ApiOperation({ summary: '품종 카테고리 목록 (ㄱ-ㅎ)' })
  @ApiResponse({ status: 200, description: 'List of categories with counts' })
  async getCategories(@Query('species') species: string = 'dog') {
    return this.breedService.getCategories(species);
  }
}

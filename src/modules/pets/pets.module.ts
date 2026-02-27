import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pet } from './entities/pet.entity';
import { DogBreed } from './entities/dog-breed.entity';
import { CatBreed } from './entities/cat-breed.entity';
import { BreedController } from './controllers/breed.controller';
import { PetController } from './controllers/pet.controller';
import { BreedService } from './services/breed.service';
import { PetService } from './services/pet.service';
import { BreedSeeder } from '../../database/seeds/breed-seeder';
import { CatBreedSeeder } from '../../database/seeds/cat-breed-seeder';

@Module({
  imports: [TypeOrmModule.forFeature([Pet, DogBreed, CatBreed])],
  controllers: [BreedController, PetController],
  providers: [BreedService, PetService, BreedSeeder, CatBreedSeeder],
  exports: [TypeOrmModule, BreedService, PetService, BreedSeeder, CatBreedSeeder],
})
export class PetsModule {}

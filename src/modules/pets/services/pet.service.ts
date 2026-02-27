import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from '../entities/pet.entity';

@Injectable()
export class PetService {
  constructor(
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
  ) {}

  async findByOwner(ownerId: string): Promise<Pet[]> {
    return this.petRepository.find({
      where: { ownerId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Pet> {
    const pet = await this.petRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }
    return pet;
  }

  async create(ownerId: string, data: Partial<Pet>): Promise<Pet> {
    const pet = this.petRepository.create({ ...data, ownerId });
    return this.petRepository.save(pet);
  }

  async update(id: string, ownerId: string, data: Partial<Pet>): Promise<Pet> {
    const pet = await this.petRepository.findOne({
      where: { id, ownerId, isDeleted: false },
    });
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }
    Object.assign(pet, data);
    return this.petRepository.save(pet);
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const pet = await this.petRepository.findOne({
      where: { id, ownerId, isDeleted: false },
    });
    if (!pet) {
      throw new NotFoundException(`Pet with ID ${id} not found`);
    }
    pet.isDeleted = true;
    pet.deletedAt = new Date();
    await this.petRepository.save(pet);
  }
}

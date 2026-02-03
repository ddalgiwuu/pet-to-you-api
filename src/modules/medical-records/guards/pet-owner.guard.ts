import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pet } from '../../pets/entities/pet.entity';

/**
 * 🔒 Pet Owner Guard
 *
 * Ensures that only the pet owner can access pet-related resources
 *
 * Usage:
 * ```typescript
 * @UseGuards(PetOwnerGuard)
 * @Get(':petId/health-notes')
 * async getHealthNotes(@Param('petId') petId: string, @Req() req) {
 *   // req.user.id === pet.ownerId verified
 * }
 * ```
 */
@Injectable()
export class PetOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id; // From JWT authentication
    const petId = request.params.petId || request.body.petId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    if (!petId) {
      throw new ForbiddenException('Pet ID required');
    }

    // Verify pet ownership
    const pet = await this.petRepository.findOne({
      where: { id: petId, isDeleted: false },
    });

    if (!pet) {
      throw new NotFoundException(`Pet ${petId} not found`);
    }

    if (pet.ownerId !== userId) {
      throw new ForbiddenException('You do not own this pet');
    }

    // Attach pet to request for use in controller
    request.pet = pet;

    return true;
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/types/auth-request.type';
import { PetService } from '../services/pet.service';

@ApiTags('pets')
@Controller('pets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Get()
  @ApiOperation({ summary: 'List current user pets' })
  @ApiResponse({ status: 200, description: 'List of pets' })
  async getMyPets(@Req() req: AuthRequest) {
    const pets = await this.petService.findByOwner(req.user.id);
    return { success: true, data: pets };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pet by ID' })
  @ApiResponse({ status: 200, description: 'Pet details' })
  async getPetById(@Param('id') id: string) {
    const pet = await this.petService.findById(id);
    return { success: true, data: pet };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new pet' })
  @ApiResponse({ status: 201, description: 'Pet created' })
  async createPet(@Req() req: AuthRequest, @Body() data: any) {
    const pet = await this.petService.create(req.user.id, data);
    return { success: true, data: pet };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pet' })
  @ApiResponse({ status: 200, description: 'Pet updated' })
  async updatePet(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() data: any,
  ) {
    const pet = await this.petService.update(id, req.user.id, data);
    return { success: true, data: pet };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete pet (soft delete)' })
  @ApiResponse({ status: 204, description: 'Pet deleted' })
  async deletePet(@Param('id') id: string, @Req() req: AuthRequest) {
    await this.petService.softDelete(id, req.user.id);
  }

  @Post(':petId/photos')
  @ApiOperation({ summary: 'Upload pet photo' })
  @ApiResponse({ status: 201, description: 'Photo uploaded' })
  async uploadPhoto(
    @Param('petId') petId: string,
    @Req() req: AuthRequest,
    @Body() data: any,
  ) {
    // For now, accept photo URL in body and update pet's photoUrls
    const pet = await this.petService.findById(petId);
    const photoUrls = pet.photoUrls || [];
    if (data.photoUrl) {
      photoUrls.push(data.photoUrl);
    }
    const updated = await this.petService.update(petId, req.user.id, { photoUrls });
    return { success: true, data: updated };
  }
}

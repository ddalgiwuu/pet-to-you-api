import {
  Controller,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UsersService } from '../services/users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '내 프로필 수정' })
  @ApiResponse({ status: 200, description: '프로필이 수정되었습니다', type: User })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  async updateMe(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ success: boolean; data: User }> {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return { success: true, data: updated };
  }
}

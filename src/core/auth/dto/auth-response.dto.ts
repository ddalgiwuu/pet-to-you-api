import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../modules/users/entities/user.entity';

export class TokenPair {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access token (15 minutes validity)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token (7 days validity)',
  })
  refreshToken: string;

  @ApiProperty({
    example: 900,
    description: 'Access token expiration time in seconds',
  })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({
    type: () => User,
    description: 'Authenticated user information',
  })
  user: Partial<User>;

  @ApiProperty({
    type: () => TokenPair,
    description: 'JWT token pair',
  })
  tokens: TokenPair;
}

import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Valid email address is required' })
  email: string;

  @ApiProperty({
    example: 'SecureP@ssw0rd123',
    description: 'User password',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  Matches,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../modules/users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Valid email address is required' })
  email: string;

  @ApiProperty({
    example: 'SecureP@ssw0rd123',
    description: 'Password (min 8 chars, uppercase, lowercase, number, special char)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100, { message: 'Password is too long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name is too long' })
  name: string;

  @ApiProperty({
    example: '01012345678',
    description: 'Phone number (digits only)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^010\d{8}$/, { message: 'Invalid phone number format (010XXXXXXXX)' })
  phoneNumber?: string;

  @ApiProperty({
    example: '1990-01-15',
    description: 'Date of birth (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format (YYYY-MM-DD)' })
  dateOfBirth?: string;

  @ApiProperty({
    example: 'M',
    description: 'Gender (M/F/Other)',
    enum: ['M', 'F', 'Other'],
    required: false,
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({
    example: UserRole.CONSUMER,
    description: 'User role',
    enum: UserRole,
    default: UserRole.CONSUMER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    example: true,
    description: 'Acceptance of terms and conditions (required)',
  })
  @IsBoolean()
  termsAccepted: boolean;

  @ApiProperty({
    example: true,
    description: 'Acceptance of privacy policy (required)',
  })
  @IsBoolean()
  privacyPolicyAccepted: boolean;

  @ApiProperty({
    example: false,
    description: 'Marketing consent (optional)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}

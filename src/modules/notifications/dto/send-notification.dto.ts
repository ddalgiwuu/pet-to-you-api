import { IsString, IsOptional, IsObject, IsNumber, IsDate, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NotificationPreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

export class SendNotificationDto {
  @ApiProperty({ example: 'booking_confirmation' })
  @IsString()
  templateId: string;

  @ApiProperty({ example: 'user-uuid-123' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+821012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'fcm-device-token-abc123' })
  @IsOptional()
  @IsString()
  deviceToken?: string;

  @ApiProperty({ example: { bookingNumber: 'BOOK-123', hospitalName: 'Pet Hospital' } })
  @IsObject()
  variables: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => NotificationPreferencesDto)
  preferences?: NotificationPreferencesDto;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

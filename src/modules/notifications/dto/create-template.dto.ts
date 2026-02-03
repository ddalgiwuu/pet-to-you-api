import { IsString, IsEnum, IsBoolean, IsOptional, IsArray, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, TemplateCategory } from '../entities/notification-template.entity';

export class CreateTemplateDto {
  @ApiProperty({ example: 'booking_confirmation' })
  @IsString()
  templateId: string;

  @ApiProperty({ example: 'Booking Confirmation Email' })
  @IsString()
  name: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.EMAIL })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: TemplateCategory, example: TemplateCategory.BOOKING })
  @IsEnum(TemplateCategory)
  category: TemplateCategory;

  @ApiProperty({ example: 'Your booking is confirmed' })
  @IsString()
  subject: string;

  @ApiProperty({ example: 'Dear {{userName}}, your booking #{{bookingNumber}} is confirmed.' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ example: '<h1>Booking Confirmed</h1><p>Dear {{userName}}...</p>' })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiProperty({ example: '예약이 확인되었습니다' })
  @IsString()
  subjectKo: string;

  @ApiProperty({ example: '{{userName}}님, 예약번호 {{bookingNumber}}가 확인되었습니다.' })
  @IsString()
  bodyKo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  htmlBodyKo?: string;

  @ApiPropertyOptional({ example: ['userName', 'bookingNumber'] })
  @IsOptional()
  @IsArray()
  requiredVariables?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  defaultVariables?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  sampleVariables?: Record<string, string>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  maxSendsPerHour?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  maxSendsPerDay?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  cooldownMinutes?: number;

  @ApiPropertyOptional({ example: 'naver_cloud' })
  @IsOptional()
  @IsString()
  smsProvider?: string;

  @ApiPropertyOptional({ example: '+821012345678' })
  @IsOptional()
  @IsString()
  senderPhoneNumber?: string;

  @ApiPropertyOptional({ example: 'KAKAO_TEMPLATE_001' })
  @IsOptional()
  @IsString()
  kakaoTemplateCode?: string;

  @ApiPropertyOptional({ example: 'noreply@pet-to-you.com' })
  @IsOptional()
  @IsString()
  fromEmail?: string;

  @ApiPropertyOptional({ example: 'Pet to You' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

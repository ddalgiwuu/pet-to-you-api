import { IsString, IsEnum, IsObject, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventType } from '../schemas/user-event.schema';

export class TrackEventDto {
  @ApiProperty({ enum: EventType, description: 'Type of event being tracked' })
  @IsEnum(EventType)
  @IsNotEmpty()
  eventType: EventType;

  @ApiProperty({ description: 'User ID associated with the event' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Session ID for tracking user sessions' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ 
    description: 'Additional event-specific properties',
    example: { page: '/hospitals', action: 'view_details', hospitalId: '123' }
  })
  @IsObject()
  @IsOptional()
  eventProperties?: Record<string, any>;

  @ApiProperty({ 
    description: 'Metadata about the request',
    example: { userAgent: 'Mozilla/5.0...', platform: 'web' }
  })
  @IsObject()
  @IsOptional()
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    platform?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  };
}

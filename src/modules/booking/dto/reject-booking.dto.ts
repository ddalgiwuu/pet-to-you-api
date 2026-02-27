import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectBookingDto {
  @ApiProperty({ description: '거절 사유', example: '해당 시간 예약 마감' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

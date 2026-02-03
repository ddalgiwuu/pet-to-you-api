import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Medical Access DTO - Required for accessing encrypted medical data
 *
 * Compliance:
 * - 의료법 (Medical Act) Article 19: Purpose of access must be recorded
 * - 개인정보보호법 (PIPA): Legal basis required
 */
export class MedicalAccessDto {
  @ApiProperty({
    description: 'Purpose of accessing medical data',
    example: '진료 목적',
    examples: [
      '진료 목적',
      '보험 청구 목적',
      '진료 기록 조회',
      '보호자 요청',
      '타 병원 의뢰',
    ],
  })
  @IsString()
  @MaxLength(500)
  purpose: string;

  @ApiProperty({
    description: 'Legal basis for accessing data',
    example: '진료계약 이행',
    examples: [
      '진료계약 이행',
      '법적 의무 이행',
      '정보주체 동의',
      '보험 청구를 위한 필요',
      '생명·신체 보호를 위한 긴급 처리',
    ],
  })
  @IsString()
  @MaxLength(200)
  legalBasis: string;
}

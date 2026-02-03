import { IsString, IsEnum, IsOptional, IsArray, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 📤 Data Export Request DTO
 *
 * PIPA Article 35: Right to Data Portability
 */
export class DataExportRequestDto {
  @IsEnum(['json', 'csv'])
  @IsOptional()
  format?: 'json' | 'csv' = 'json';
}

/**
 * 🚨 Breach Report DTO
 *
 * PIPA Article 34: Breach Notification
 */
export class BreachReportDto {
  @IsEnum([
    'unauthorized_access',
    'data_leak',
    'ransomware',
    'insider_threat',
    'system_compromise',
    'medical_data_breach',
  ])
  type:
    | 'unauthorized_access'
    | 'data_leak'
    | 'ransomware'
    | 'insider_threat'
    | 'system_compromise'
    | 'medical_data_breach';

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  affectedDataTypes: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedUserIds?: string[];

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  discoveredAt?: Date;

  @IsString()
  detectedBy: string;

  @IsEnum(['critical', 'high', 'medium', 'low'])
  severity: 'critical' | 'high' | 'medium' | 'low';

  @IsEnum(['contained', 'in_progress', 'uncontained'])
  containmentStatus: 'contained' | 'in_progress' | 'uncontained';

  @IsString()
  estimatedImpact: string;
}

/**
 * 📊 Audit Report Request DTO
 */
export class AuditReportRequestDto {
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['pdf', 'json', 'csv'])
  @IsOptional()
  format?: 'pdf' | 'json' | 'csv' = 'pdf';

  @IsBoolean()
  @IsOptional()
  download?: boolean = true;
}

/**
 * 🔍 Suspicious Activity Query DTO
 */
export class SuspiciousActivityQueryDto {
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['critical', 'high', 'medium', 'low', 'all'])
  @IsOptional()
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'all' = 'all';
}

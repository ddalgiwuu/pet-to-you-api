import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AuditLog]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

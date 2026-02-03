import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { MedicalRecordsController } from './controllers/medical-records.controller';
import { MedicalRecordsService } from './services/medical-records.service';
import { PetOwnerGuard } from './guards/pet-owner.guard';
import { HealthNote } from './entities/health-note.entity';
import { VaccinationRecord } from './entities/vaccination-record.entity';
import { Pet } from '../pets/entities/pet.entity';
import { EncryptionModule } from '../../core/encryption/encryption.module';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthNote, VaccinationRecord, Pet]),
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100, // Maximum number of items in cache
    }),
    EncryptionModule,
    AuditModule,
  ],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService, PetOwnerGuard],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}

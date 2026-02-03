import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { KmsService } from './kms.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionService, KmsService],
  exports: [EncryptionService, KmsService],
})
export class EncryptionModule {}

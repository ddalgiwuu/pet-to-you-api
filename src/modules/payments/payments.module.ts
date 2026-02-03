import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { HospitalPayment } from './entities/hospital-payment.entity';
import { PaymentsService } from './services/payments.service';
import { TossPaymentsService } from './services/toss-payments.service';
import { PaymentSettlementService } from './services/payment-settlement.service';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentSettlementController } from './controllers/payment-settlement.controller';
import { InsuranceClaim } from '../insurance/entities/insurance-claim.entity';
import { Hospital } from '../hospitals/entities/hospital.entity';
import { HealthNote } from '../medical-records/entities/health-note.entity';
import { AuditModule } from '../../core/audit/audit.module';
import { EncryptionModule } from '../../core/encryption/encryption.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentTransaction,
      HospitalPayment,
      InsuranceClaim,
      Hospital,
      HealthNote,
    ]),
    ConfigModule,
    AuditModule,
    EncryptionModule,
  ],
  controllers: [
    PaymentsController,
    PaymentSettlementController,
  ],
  providers: [
    PaymentsService,
    TossPaymentsService,
    PaymentSettlementService,
  ],
  exports: [
    PaymentsService,
    TossPaymentsService,
    PaymentSettlementService,
  ],
})
export class PaymentsModule {}

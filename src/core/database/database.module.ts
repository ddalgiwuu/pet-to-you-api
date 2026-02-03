import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

// ============================================================
// Entity Imports (Explicit to avoid glob pattern recursion)
// ============================================================

// Users Module
import { User } from '../../modules/users/entities/user.entity';
import { UserProfile } from '../../modules/users/entities/user-profile.entity';

// Pets Module
import { Pet } from '../../modules/pets/entities/pet.entity';
import { DogBreed } from '../../modules/pets/entities/dog-breed.entity';
import { CatBreed } from '../../modules/pets/entities/cat-breed.entity';

// Booking Module
import { Booking } from '../../modules/booking/entities/booking.entity';

// Adoption Module
import { PetListing } from '../../modules/adoption/entities/pet-listing.entity';
import { AdoptionApplication } from '../../modules/adoption/entities/adoption-application.entity';
import { Shelter } from '../../modules/adoption/entities/shelter.entity';

// Daycare Module
import { DaycareReservation } from '../../modules/daycare/entities/daycare-reservation.entity';
import { DaycareCenter } from '../../modules/daycare/entities/daycare-center.entity';

// Payments Module
import { Payment } from '../../modules/payments/entities/payment.entity';
import { PaymentTransaction } from '../../modules/payments/entities/payment-transaction.entity';

// Insurance Module
import { InsurancePolicy } from '../../modules/insurance/entities/insurance-policy.entity';
import { UserInsurance } from '../../modules/insurance/entities/user-insurance.entity';
import { InsuranceClaim } from '../../modules/insurance/entities/insurance-claim.entity';

// Medical Records Module
import { HealthNote } from '../../modules/medical-records/entities/health-note.entity';
import { VaccinationRecord } from '../../modules/medical-records/entities/vaccination-record.entity';

// Hospitals Module
import { Hospital } from '../../modules/hospitals/entities/hospital.entity';
import { HospitalUser } from '../../modules/hospitals/entities/hospital-user.entity';
import { HospitalPayment } from '../../modules/payments/entities/hospital-payment.entity';

// Insurance Module (New)
import { AutoClaimSuggestion } from '../../modules/insurance/entities/auto-claim-suggestion.entity';

// Community Module
import { CommunityPost } from '../../modules/community/entities/community-post.entity';
import { Review } from '../../modules/community/entities/review.entity';
import { Comment } from '../../modules/community/entities/comment.entity';
import { Like } from '../../modules/community/entities/like.entity';

// Notifications Module
import { NotificationTemplate } from '../../modules/notifications/entities/notification-template.entity';

// Compliance Module
import { SecurityIncident } from '../../modules/compliance/entities/security-incident.entity';
import { DataRetentionLog } from '../../modules/compliance/entities/data-retention-log.entity';

@Global()
@Module({
  imports: [
    // PostgreSQL Connection (Transactional Data)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [
          // Users
          User,
          UserProfile,
          // Pets
          Pet,
          DogBreed,
          CatBreed,
          // Booking
          Booking,
          // Adoption
          PetListing,
          AdoptionApplication,
          Shelter,
          // Daycare
          DaycareReservation,
          DaycareCenter,
          // Payments
          Payment,
          PaymentTransaction,
          // Insurance
          InsurancePolicy,
          UserInsurance,
          InsuranceClaim,
          AutoClaimSuggestion,
          // Medical Records
          HealthNote,
          VaccinationRecord,
          // Hospitals
          Hospital,
          HospitalUser,
          HospitalPayment,
          // Community
          CommunityPost,
          Review,
          Comment,
          Like,
          // Notifications
          NotificationTemplate,
          // Compliance
          SecurityIncident,
          DataRetentionLog,
        ],
        migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
        synchronize: false, // ⚠️ Disabled due to TypeORM index bug - use manual migration
        migrationsRun: false,
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? {
          rejectUnauthorized: true,
        } : false,
        poolSize: 20,
        extra: {
          max: 20,
          min: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    }),

    // MongoDB Connection (Search & Analytics)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
        // useNewUrlParser and useUnifiedTopology removed (deprecated in Mongoose 6+)
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
    }),
  ],
  exports: [TypeOrmModule, MongooseModule],
})
export class DatabaseModule {}

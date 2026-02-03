import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { DaycareCenter } from './entities/daycare-center.entity';
import { DaycareReservation } from './entities/daycare-reservation.entity';
import { DaycareSearch, DaycareSearchSchema } from './schemas/daycare-search.schema';
import { DaycareService } from './services/daycare.service';
import { DaycareController } from './controllers/daycare.controller';

@Module({
  imports: [
    // PostgreSQL entities
    TypeOrmModule.forFeature([DaycareCenter, DaycareReservation]),

    // MongoDB schemas for geospatial search
    MongooseModule.forFeature([
      { name: DaycareSearch.name, schema: DaycareSearchSchema },
    ]),
  ],
  controllers: [DaycareController],
  providers: [DaycareService],
  exports: [DaycareService],
})
export class DaycareModule {}

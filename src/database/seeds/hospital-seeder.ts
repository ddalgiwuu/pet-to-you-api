/**
 * Hospital Seeder
 * Seeds 2,137 Seoul hospitals with PostGIS geometry
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hospital, HospitalStatus } from '../../modules/hospitals/entities/hospital.entity';
import { HospitalSearch, HospitalSearchDocument } from '../../modules/hospitals/schemas/hospital.schema';
import { HospitalCsvParser } from '../parsers/hospital-csv-parser';
import * as path from 'path';

@Injectable()
export class HospitalSeeder {
  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalRepository: Repository<Hospital>,
    @InjectModel(HospitalSearch.name)
    private readonly hospitalSearchModel: Model<HospitalSearchDocument>,
  ) {}

  async run(): Promise<void> {
    console.log('\n🏥 Starting hospital seeding...\n');

    try {
      // Parse CSV file
      const csvPath = path.join(__dirname, '../../../data/서울동물병원데이터.csv');
      console.log(`📄 Reading CSV from: ${csvPath}`);

      const parser = new HospitalCsvParser();
      const parsedData = await parser.parse(csvPath);

      // Transform parsed data to Hospital entities with all required fields
      const hospitals = parsedData.map((data) => {
        const hospital = this.hospitalRepository.create({
          // Basic information
          name: data.name,
          status: data.status === 'active' ? HospitalStatus.ACTIVE : HospitalStatus.TEMPORARILY_CLOSED,

          // Business registration
          businessRegistrationNumber: data.businessRegistrationNumber,
          representativeName: data.representativeName,
          veterinaryLicenseNumber: data.veterinaryLicenseNumber,
          isVerified: false, // Will be verified manually later

          // Location
          postalCode: data.postalCode,
          sido: data.sido,
          sigungu: data.sigungu,
          dong: data.dong || undefined,
          roadAddress: data.roadAddress,
          latitude: data.latitude,
          longitude: data.longitude,

          // Contact
          phoneNumber: data.phoneNumber,

          // Operating hours (default: 9AM-7PM weekdays)
          operatingHours: {
            monday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
            tuesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
            wednesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
            thursday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
            friday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
            saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
            sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
          },
          is24Hours: data.is24Hours,

          // Services (default general services)
          services: ['일반진료', '예방접종', '건강검진'],
          supportedSpecies: ['dog', 'cat'],

          // Facilities
          hasParking: data.hasParking,
          hasEmergency: data.hasEmergency,
          hasGrooming: false,
          hasHotel: false,
        });

        return hospital;
      });

      // Batch insert to PostgreSQL (500 records at a time)
      const batchSize = 500;
      let insertedCount = 0;
      const savedHospitals: Hospital[] = [];

      for (let i = 0; i < hospitals.length; i += batchSize) {
        const batch = hospitals.slice(i, i + batchSize);

        try {
          const saved = await this.hospitalRepository.save(batch, { chunk: 100 });
          savedHospitals.push(...saved);
          insertedCount += batch.length;

          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(hospitals.length / batchSize);

          console.log(
            `✅ PostgreSQL Batch ${batchNumber}/${totalBatches} inserted (${batch.length} records) - Total: ${insertedCount}`,
          );
        } catch (error) {
          console.error(`❌ PostgreSQL Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
          // Continue with next batch
        }
      }

      // Sync to MongoDB for geospatial search
      console.log('\n📊 Syncing to MongoDB for geospatial search...');
      let mongoCount = 0;

      for (let i = 0; i < savedHospitals.length; i += batchSize) {
        const batch = savedHospitals.slice(i, i + batchSize);
        const mongoDocs = batch.map(hospital => ({
          id: hospital.id,
          name: hospital.name,
          nameEnglish: hospital.nameEnglish,
          type: hospital.type,
          status: hospital.status,
          description: hospital.description,
          location: {
            type: 'Point' as const,
            coordinates: [hospital.longitude, hospital.latitude],
          },
          latitude: hospital.latitude,
          longitude: hospital.longitude,
          sido: hospital.sido,
          sigungu: hospital.sigungu,
          dong: hospital.dong,
          roadAddress: hospital.roadAddress,
          fullAddress: hospital.getFullAddress(),
          phoneNumber: hospital.phoneNumber,
          emergencyPhoneNumber: hospital.emergencyPhoneNumber,
          email: hospital.email,
          websiteUrl: hospital.websiteUrl,
          businessRegistrationNumber: hospital.businessRegistrationNumber,
          isVerified: hospital.isVerified,
          operatingHours: hospital.operatingHours,
          is24Hours: hospital.is24Hours,
          holidays: hospital.holidays,
          isCurrentlyOpen: hospital.isCurrentlyOpen(),
          services: hospital.services,
          specialties: hospital.specialties,
          supportedSpecies: hospital.supportedSpecies,
          hasParking: hospital.hasParking,
          hasEmergency: hospital.hasEmergency,
          hasGrooming: hospital.hasGrooming,
          hasHotel: hospital.hasHotel,
          acceptsInsurance: hospital.acceptsInsurance,
          averageRating: hospital.averageRating,
          totalReviews: hospital.totalReviews,
          totalBookings: hospital.totalBookings,
          viewCount: hospital.viewCount,
          bookmarkCount: hospital.bookmarkCount,
          logoUrl: hospital.logoUrl,
          photoUrls: hospital.photoUrls,
          isDeleted: hospital.isDeleted,
          lastSyncedAt: new Date(),
        }));

        try {
          await this.hospitalSearchModel.insertMany(mongoDocs);
          mongoCount += mongoDocs.length;

          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(savedHospitals.length / batchSize);
          console.log(`✅ MongoDB Batch ${batchNumber}/${totalBatches} synced (${mongoDocs.length} records) - Total: ${mongoCount}`);
        } catch (error) {
          console.error(`❌ MongoDB Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
        }
      }

      console.log(`\n📊 MongoDB sync complete: ${mongoCount} hospitals`);

      // Update PostGIS geometry column
      console.log('\n📍 Updating PostGIS geometry...');
      await this.updateGeometry();

      // Get statistics
      const total = await this.hospitalRepository.count();
      const activeCount = await this.hospitalRepository.count({
        where: { status: HospitalStatus.ACTIVE },
      });
      const hour24Count = await this.hospitalRepository.count({ where: { is24Hours: true } });

      const regionalStats = await this.hospitalRepository
        .createQueryBuilder('hospital')
        .select('hospital.sido', 'sido')
        .addSelect('hospital.sigungu', 'sigungu')
        .addSelect('COUNT(*)', 'count')
        .groupBy('hospital.sido')
        .addGroupBy('hospital.sigungu')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

      console.log('\n✨ Hospital seeding completed!\n');
      console.log(`📊 Statistics:`);
      console.log(`   Total hospitals: ${total}`);
      console.log(`   Active: ${activeCount}`);
      console.log(`   24-hour: ${hour24Count}`);
      console.log(`   Successfully inserted: ${insertedCount} / ${hospitals.length}`);
      console.log(`   Top 10 regions by hospital count:`);

      regionalStats.forEach((stat, index) => {
        console.log(`     ${index + 1}. ${stat.sido} ${stat.sigungu}: ${stat.count}`);
      });

    } catch (error) {
      console.error('❌ Hospital seeding failed:', error);
      throw error;
    }
  }

  /**
   * Update PostGIS geometry column from latitude/longitude
   */
  private async updateGeometry(): Promise<void> {
    try {
      await this.hospitalRepository.query(`
        UPDATE hospitals
        SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND location IS NULL;
      `);

      const geometryCount = await this.hospitalRepository
        .createQueryBuilder()
        .where('location IS NOT NULL')
        .getCount();

      console.log(`✅ Updated ${geometryCount} hospital geometries`);
    } catch (error) {
      console.log(`⚠️  PostGIS geometry update skipped (extension may not be installed):`, error.message);
      console.log(`   You can run the migration later to add spatial indexing`);
    }
  }
}

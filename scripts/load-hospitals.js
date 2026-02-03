/**
 * Load Seoul Hospital CSV Data directly to MongoDB
 */

const mongoose = require('mongoose');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');

async function loadHospitals() {
  try {
    // Connect to MongoDB
    const mongoUri = 'mongodb+srv://wonseok9706_db_user:1EY0d2oKTCn2o5tp@pettoyou.uq2lrlf.mongodb.net/pettoyou?appName=pettoyou';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Read CSV
    const csvPath = path.join(__dirname, '../data/서울동물병원데이터.csv');
    const csvData = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV
    const results = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
    });

    console.log(`📄 Parsed ${results.data.length} hospitals from CSV`);

    // Transform to MongoDB documents
    const hospitals = results.data.map(row => {
      const lat = parseFloat(row['위도'] || row['latitude']);
      const lng = parseFloat(row['경도'] || row['longitude']);

      return {
        name: row['사업장명'] || row['name'],
        type: 'hospital',
        status: 'active',

        // Location (GeoJSON Point)
        location: {
          type: 'Point',
          coordinates: [lng, lat] // [longitude, latitude]
        },
        latitude: lat,
        longitude: lng,

        // Address
        sido: row['시도'] || '서울특별시',
        sigungu: row['시군구'] || '',
        dong: row['동'] || '',
        roadAddress: row['도로명주소'] || row['주소'] || '',
        fullAddress: row['주소'] || '',
        postalCode: row['우편번호'] || '',

        // Contact
        phoneNumber: row['전화번호'] || row['phone'] || '정보없음',

        // Operating hours (default)
        operatingHours: {
          monday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          tuesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          wednesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          thursday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          friday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
          sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
        },
        is24Hours: false,
        hasEmergency: false,
        hasParking: false,

        // Services
        services: ['일반진료', '예방접종'],
        supportedSpecies: ['dog', 'cat'],

        // Business
        businessRegistrationNumber: `BRN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isVerified: false,

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
        lastSyncedAt: new Date(),
      };
    });

    // Filter valid hospitals (with coordinates)
    const validHospitals = hospitals.filter(h =>
      h.latitude && h.longitude &&
      !isNaN(h.latitude) && !isNaN(h.longitude) &&
      h.name
    );

    console.log(`✅ Filtered to ${validHospitals.length} valid hospitals`);

    // Insert to MongoDB
    const collection = mongoose.connection.collection('hospitals');

    // Clear existing data
    await collection.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Batch insert
    const batchSize = 500;
    for (let i = 0; i < validHospitals.length; i += batchSize) {
      const batch = validHospitals.slice(i, i + batchSize);
      await collection.insertMany(batch);
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validHospitals.length / batchSize)}`);
    }

    // Create geospatial index
    await collection.createIndex({ location: '2dsphere' });
    console.log('📍 Created 2dsphere index on location');

    // Create other indexes
    await collection.createIndex({ name: 'text' });
    await collection.createIndex({ sido: 1, sigungu: 1 });
    console.log('📇 Created search indexes');

    // Statistics
    const total = await collection.countDocuments();
    console.log(`\n✨ Success! Loaded ${total} hospitals to MongoDB\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

loadHospitals();

/**
 * Reload hospitals to MongoDB with correct coordinates using updated parser
 */

const mongoose = require('mongoose');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');
const proj4 = require('proj4');

// Use the corrected Korean Central Belt projection from parser
proj4.defs('KOREA_CENTRAL', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

async function reload() {
  try {
    await mongoose.connect('mongodb+srv://***USERNAME_REMOVED***:***PASSWORD_REMOVED***@pettoyou.uq2lrlf.mongodb.net/pettoyou');
    console.log('✅ MongoDB connected');

    const csv = fs.readFileSync(path.join(__dirname, '../data/서울동물병원데이터.csv'), 'utf-8');
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    console.log(`📄 Parsed ${parsed.data.length} rows`);

    const hospitals = [];
    let skipped = 0;

    for (const row of parsed.data) {
      const x = parseFloat(row['좌표정보(x)']);
      const y = parseFloat(row['좌표정보(y)']);

      if (isNaN(x) || isNaN(y) || !row['사업장명']) {
        skipped++;
        continue;
      }

      // Convert coordinates
      const [lng, lat] = proj4('KOREA_CENTRAL', 'EPSG:4326', [x, y]);

      // Validate Seoul bounds
      if (lat < 37.4 || lat > 37.7 || lng < 126.7 || lng > 127.2) {
        console.log(`⚠️  Skipping ${row['사업장명']}: coords [${lng}, ${lat}] outside Seoul`);
        skipped++;
        continue;
      }

      const addressParts = (row['소재지전체주소'] || '').split(' ');

      hospitals.push({
        name: row['사업장명'],
        type: 'hospital',
        status: row['영업상태명']?.includes('영업') ? 'active' : 'inactive',
        description: row['병원 소개'] || '',
        location: { type: 'Point', coordinates: [lng, lat] },
        latitude: lat,
        longitude: lng,
        sido: addressParts[0] || '서울특별시',
        sigungu: addressParts[1] || '',
        dong: addressParts[2] || '',
        roadAddress: row['소재지전체주소'] || '',
        fullAddress: row['소재지전체주소'] || '',
        phoneNumber: row['소재지전화'] || '정보없음',
        websiteUrl: row['웹사이트 링크'] || null,
        is24Hours: false,
        hasEmergency: false,
        hasParking: (row['제로페이, 주차'] || '').includes('주차'),
        hasGrooming: false,
        hasHotel: false,
        operatingHours: {
          monday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          tuesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          wednesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          thursday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          friday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
          saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
          sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
        },
        services: ['일반진료', '예방접종'],
        supportedSpecies: ['dog', 'cat'],
        averageRating: 0,
        reviewCount: 0,
        isCurrentlyOpen: row['영업상태명']?.includes('영업'),
        isDeleted: false,
        lastSyncedAt: new Date(),
      });
    }

    console.log(`✅ Converted ${hospitals.length} valid hospitals (skipped ${skipped})`);
    console.log(`📍 Sample: ${hospitals[0].name} at [${hospitals[0].longitude.toFixed(4)}, ${hospitals[0].latitude.toFixed(4)}]`);

    if (hospitals.length === 0) {
      console.log('❌ No valid hospitals!');
      process.exit(1);
    }

    const db = mongoose.connection.db;
    const coll = db.collection('hospitals');

    await coll.deleteMany({});
    await coll.insertMany(hospitals);
    await coll.createIndex({ location: '2dsphere' });
    await coll.createIndex({ name: 'text' });
    await coll.createIndex({ sido: 1, sigungu: 1 });

    const count = await coll.countDocuments();
    const sample = await coll.findOne({});

    console.log(`\n✨ Success! Loaded ${count} hospitals to MongoDB`);
    console.log(`📌 Sample check: ${sample.name} at [${sample.longitude}, ${sample.latitude}]`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

reload();

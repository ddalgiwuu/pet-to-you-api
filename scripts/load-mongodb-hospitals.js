/**
 * Load Seoul Hospital CSV to MongoDB with coordinate conversion
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');
const proj4 = require('proj4');

// Korean coordinate system (EPSG:5179) to WGS84 conversion
proj4.defs('EPSG:5179', '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs');

function convertCoords(x, y) {
  try {
    const [lng, lat] = proj4('EPSG:5179', 'EPSG:4326', [parseFloat(x), parseFloat(y)]);
    return { lat, lng };
  } catch (e) {
    return null;
  }
}

async function load() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in .env file');
  }

  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected');

  const csv = fs.readFileSync(path.join(__dirname, '../data/서울동물병원데이터.csv'), 'utf-8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  console.log(`📄 Parsed ${parsed.data.length} rows`);

  const hospitals = [];
  for (const row of parsed.data) {
    const coords = convertCoords(row['좌표정보(x)'], row['좌표정보(y)']);
    if (!coords || !row['사업장명']) continue;

    hospitals.push({
      name: row['사업장명'],
      status: row['영업상태명'] === '영업/정상' ? 'active' : 'inactive',
      location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      latitude: coords.lat,
      longitude: coords.lng,
      sido: '서울특별시',
      sigungu: row['도로명전체주소']?.split(' ')[2] || '',
      roadAddress: row['도로명전체주소'] || '',
      fullAddress: row['소재지전체주소'] || '',
      phoneNumber: row['소재지전화'] || '정보없음',
      hasParking: (row['제로페이, 주차'] || '').includes('주차'),
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
    });
  }

  console.log(`✅ ${hospitals.length} valid hospitals`);

  const db = mongoose.connection.db;
  const coll = db.collection('hospitals');

  await coll.deleteMany({});
  await coll.insertMany(hospitals);
  await coll.createIndex({ location: '2dsphere' });
  await coll.createIndex({ name: 'text', description: 'text' });

  const count = await coll.countDocuments();
  console.log(`\n✨ Loaded ${count} hospitals to MongoDB!\n`);

  await mongoose.disconnect();
  process.exit(0);
}

load().catch(err => { console.error(err); process.exit(1); });

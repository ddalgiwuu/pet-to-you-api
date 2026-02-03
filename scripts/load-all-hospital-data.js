/**
 * Load ALL hospital data from CSV including operating hours from 공지 field
 */

const mongoose = require('mongoose');
const fs = require('fs');
const Papa = require('papaparse');
const path = require('path');
const proj4 = require('proj4');

proj4.defs('KOREA_CENTRAL', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');

function parseOperatingHours(notice) {
  const dayMap = {
    '월': 'monday', '화': 'tuesday', '수': 'wednesday', '목': 'thursday',
    '금': 'friday', '토': 'saturday', '일': 'sunday',
  };

  const defaultHours = {
    monday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
    friday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
    sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
  };

  if (!notice) return defaultHours;

  try {
    // 24시간
    if (notice.includes('24시간') || notice.includes('24시') || notice.includes('연중무휴')) {
      const allDay = { isOpen: true, openTime: '00:00', closeTime: '23:59' };
      return { monday: allDay, tuesday: allDay, wednesday: allDay, thursday: allDay, friday: allDay, saturday: allDay, sunday: allDay };
    }

    const timeMatch = notice.match(/(\d{1,2}):(\d{2})\s*[~\-]\s*(\d{1,2}):(\d{2})/);
    let openTime = '09:00', closeTime = '19:00';

    if (timeMatch) {
      openTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      closeTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;
    }

    const result = { ...defaultHours };

    // 휴진일 확인
    Object.keys(dayMap).forEach(korDay => {
      const engDay = dayMap[korDay];
      if (notice.includes(`${korDay}요일 휴진`) || notice.includes(`${korDay} 휴진`) || notice.includes(`${korDay}휴진`)) {
        result[engDay] = { isOpen: false, openTime: '00:00', closeTime: '00:00' };
      }
    });

    // 요일 범위 파싱 (월/화/목/금)
    const dayPattern = /(?:월|화|수|목|금|토|일)(?:[\/,\s]+(?:월|화|수|목|금|토|일))+/g;
    const dayRanges = notice.match(dayPattern);

    if (dayRanges) {
      dayRanges.forEach(range => {
        const days = range.match(/월|화|수|목|금|토|일/g) || [];
        days.forEach(day => {
          const engDay = dayMap[day];
          if (engDay && result[engDay].isOpen !== false) {
            result[engDay] = { isOpen: true, openTime, closeTime };
          }
        });
      });
    }

    // 주말 시간 따로 파싱
    const weekendMatch = notice.match(/토\/일\s*(\d{1,2}):(\d{2})\s*[~\-]\s*(\d{1,2}):(\d{2})/);
    if (weekendMatch) {
      const wOpen = `${weekendMatch[1].padStart(2, '0')}:${weekendMatch[2]}`;
      const wClose = `${weekendMatch[3].padStart(2, '0')}:${weekendMatch[4]}`;
      result.saturday = { isOpen: true, openTime: wOpen, closeTime: wClose };
      result.sunday = { isOpen: true, openTime: wOpen, closeTime: wClose };
    }

    return result;
  } catch (e) {
    return defaultHours;
  }
}

async function load() {
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

    const [lng, lat] = proj4('KOREA_CENTRAL', 'EPSG:4326', [x, y]);

    if (lat < 37.4 || lat > 37.7 || lng < 126.7 || lng > 127.2) {
      skipped++;
      continue;
    }

    const notice = row['공지'] || '';
    const operatingHours = parseOperatingHours(notice);
    const addressParts = (row['소재지전체주소'] || '').split(' ');

    // Check for 24시 in name or notice
    const is24Hours = notice.includes('24시') || row['사업장명'].includes('24시');

    // Check for emergency
    const hasEmergency = notice.includes('응급') || row['사업장명'].includes('응급');

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
      is24Hours,
      hasEmergency,
      hasParking: (row['제로페이, 주차'] || '').includes('주차'),
      hasGrooming: notice.includes('미용') || row['사업장명'].includes('미용'),
      hasHotel: notice.includes('호텔') || notice.includes('펫호텔'),
      operatingHours,
      notice: notice.substring(0, 500), // Store original notice (limit length)
      services: ['일반진료', '예방접종'],
      supportedSpecies: ['dog', 'cat'],
      averageRating: 0,
      reviewCount: 0,
      isCurrentlyOpen: row['영업상태명']?.includes('영업'),
      isDeleted: false,
      lastSyncedAt: new Date(),
    });
  }

  console.log(`✅ Parsed ${hospitals.length} valid hospitals (skipped ${skipped})`);
  console.log(`📍 Sample: ${hospitals[0].name}`);
  console.log(`⏰ Operating hours:`, JSON.stringify(hospitals[0].operatingHours, null, 2));

  const db = mongoose.connection.db;
  const coll = db.collection('hospitals');

  await coll.deleteMany({});
  await coll.insertMany(hospitals);
  await coll.createIndex({ location: '2dsphere' });
  await coll.createIndex({ name: 'text', description: 'text' });
  await coll.createIndex({ sido: 1, sigungu: 1 });

  const count = await coll.countDocuments();
  const sample = await coll.findOne({});

  console.log(`\n✨ Success! Loaded ${count} hospitals with full data`);
  console.log(`📊 Features:`);
  console.log(`   - 24-hour: ${hospitals.filter(h => h.is24Hours).length}`);
  console.log(`   - Emergency: ${hospitals.filter(h => h.hasEmergency).length}`);
  console.log(`   - Parking: ${hospitals.filter(h => h.hasParking).length}`);
  console.log(`   - Grooming: ${hospitals.filter(h => h.hasGrooming).length}`);

  await mongoose.disconnect();
  process.exit(0);
}

load().catch(err => { console.error(err); process.exit(1); });

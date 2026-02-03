/**
 * Parse Korean operating hours from CSV "공지" field
 */

function parseOperatingHours(notice) {
  if (!notice) {
    return {
      monday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '19:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    };
  }

  const dayMap = {
    '월': 'monday',
    '화': 'tuesday',
    '수': 'wednesday',
    '목': 'thursday',
    '금': 'friday',
    '토': 'saturday',
    '일': 'sunday',
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

  try {
    // Check for 24-hour operation
    if (notice.includes('24시간') || notice.includes('24시') || notice.includes('연중무휴')) {
      const allDay = { isOpen: true, openTime: '00:00', closeTime: '23:59' };
      return {
        monday: allDay,
        tuesday: allDay,
        wednesday: allDay,
        thursday: allDay,
        friday: allDay,
        saturday: allDay,
        sunday: allDay,
      };
    }

    // Parse time pattern: "10:00~20:30" or "10:00-20:30"
    const timePattern = /(\d{1,2}):(\d{2})\s*[~\-]\s*(\d{1,2}):(\d{2})/;
    const match = notice.match(timePattern);

    let openTime = '09:00';
    let closeTime = '19:00';

    if (match) {
      openTime = `${match[1].padStart(2, '0')}:${match[2]}`;
      closeTime = `${match[3].padStart(2, '0')}:${match[4]}`;
    }

    const result = { ...defaultHours };

    // Check for closed days
    Object.keys(dayMap).forEach(korDay => {
      const engDay = dayMap[korDay];
      if (notice.includes(`${korDay}요일 휴진`) || notice.includes(`${korDay} 휴진`) || notice.includes(`${korDay}휴진`)) {
        result[engDay] = { isOpen: false, openTime: '00:00', closeTime: '00:00' };
      } else if (notice.includes(korDay)) {
        result[engDay] = { isOpen: true, openTime, closeTime };
      }
    });

    // Handle day ranges like "월/화/목/금"
    const dayRangeMatch = notice.match(/(월|화|수|목|금|토|일)(?:\/|,|\s)+(월|화|수|목|금|토|일)/g);
    if (dayRangeMatch) {
      dayRangeMatch.forEach(range => {
        const days = range.match(/월|화|수|목|금|토|일/g);
        days?.forEach(day => {
          const engDay = dayMap[day];
          if (engDay && result[engDay].isOpen !== false) {
            result[engDay] = { isOpen: true, openTime, closeTime };
          }
        });
      });
    }

    // Weekend hours might be different
    const weekendMatch = notice.match(/토\/일\s*(\d{1,2}):(\d{2})\s*[~\-]\s*(\d{1,2}):(\d{2})/);
    if (weekendMatch) {
      const weekendOpen = `${weekendMatch[1].padStart(2, '0')}:${weekendMatch[2]}`;
      const weekendClose = `${weekendMatch[3].padStart(2, '0')}:${weekendMatch[4]}`;
      result.saturday = { isOpen: true, openTime: weekendOpen, closeTime: weekendClose };
      result.sunday = { isOpen: true, openTime: weekendOpen, closeTime: weekendClose };
    }

    return result;
  } catch (error) {
    console.error('Error parsing hours:', error);
    return defaultHours;
  }
}

// Test
const testNotice = `진료시간은
월/화/목/금 10:00~20:30 (접수마감 20:00)
수요일 휴진
토/일 10:00~19:00 입니다`;

console.log('Test parse:', JSON.stringify(parseOperatingHours(testNotice), null, 2));

module.exports = { parseOperatingHours };

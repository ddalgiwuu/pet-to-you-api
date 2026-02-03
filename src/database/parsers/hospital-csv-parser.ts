/**
 * Hospital CSV Parser
 * Parses Seoul hospital data with address normalization and coordinate validation
 * Converts EPSG:5179 (Korean Central Belt 2010) coordinates to WGS84
 */

import * as fs from 'fs';
import * as Papa from 'papaparse';
import proj4 from 'proj4';

// Define Korean projection used by Seoul data
// Note: The CSV uses Korea 2000 / Central Belt (not the official EPSG:5179)
// Tested projection that correctly converts Seoul coordinates
proj4.defs('KOREA_CENTRAL', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

interface HospitalCsvRow {
  사업장명: string;
  소재지전체주소: string;
  '좌표정보(x)': string;
  '좌표정보(y)': string;
  소재지전화: string;
  영업상태명: string;
  상세영업상태명: string;
  공지: string;
}

interface ParsedHospital {
  name: string;
  roadAddress: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  sido: string;
  sigungu: string;
  dong: string | null;
  postalCode: string;
  status: 'active' | 'inactive';
  businessRegistrationNumber: string;
  representativeName: string;
  veterinaryLicenseNumber: string;
  is24Hours: boolean;
  hasEmergency: boolean;
  hasParking: boolean;
  openingHours: string | null;
}

// Seoul coordinate boundaries (approx)
const SEOUL_BOUNDS = {
  LAT_MIN: 37.4,
  LAT_MAX: 37.7,
  LNG_MIN: 126.7,
  LNG_MAX: 127.2,
};

export class HospitalCsvParser {
  /**
   * Parse hospital CSV file
   * @param csvPath - Absolute path to CSV file
   * @returns Array of hospital objects ready for insertion
   */
  async parse(csvPath: string): Promise<Partial<ParsedHospital>[]> {
    return new Promise((resolve, reject) => {
      const hospitals: Partial<ParsedHospital>[] = [];
      let skippedCount = 0;

      const fileContent = fs.readFileSync(csvPath, 'utf-8');

      Papa.parse<HospitalCsvRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            for (const row of results.data) {
              try {
                // Parse Korean Central Belt coordinates (EPSG:5179)
                const x = parseFloat(row['좌표정보(x)']);
                const y = parseFloat(row['좌표정보(y)']);

                if (isNaN(x) || isNaN(y)) {
                  skippedCount++;
                  continue;
                }

                // Convert Korean Central Belt to WGS84 (latitude, longitude)
                const [lng, lat] = proj4('KOREA_CENTRAL', 'EPSG:4326', [x, y]);

                // Validate converted coordinates are within Seoul bounds
                if (
                  isNaN(lat) ||
                  isNaN(lng) ||
                  lat < SEOUL_BOUNDS.LAT_MIN ||
                  lat > SEOUL_BOUNDS.LAT_MAX ||
                  lng < SEOUL_BOUNDS.LNG_MIN ||
                  lng > SEOUL_BOUNDS.LNG_MAX
                ) {
                  skippedCount++;
                  continue;
                }

                // Parse address components
                const roadAddress = row.소재지전체주소 || '';
                const addressParts = roadAddress.split(' ');

                let sido = '서울특별시';
                let sigungu = '';
                let dong: string | null = null;

                if (addressParts.length >= 1) {
                  sido = addressParts[0] || '서울특별시';
                }
                if (addressParts.length >= 2) {
                  sigungu = addressParts[1] || '';
                }
                if (addressParts.length >= 3) {
                  dong = addressParts[2] || null;
                }

                // Format phone number
                const phoneNumber = this.formatPhoneNumber(row.소재지전화) || '02-0000-0000';

                // Map status (using 영업상태명 and 상세영업상태명)
                const status: 'active' | 'inactive' =
                  row.영업상태명?.includes('영업') ||
                  row.상세영업상태명?.includes('정상') ||
                  row.영업상태명 === '영업/정상'
                    ? 'active'
                    : 'inactive';

                // Check if 24-hour (from 공지 field)
                const notice = row.공지 || '';
                const is24Hours =
                  notice.includes('24시') ||
                  notice.includes('24時') ||
                  notice.includes('24hours') ||
                  row.사업장명.includes('24시');

                // Check for emergency/parking features
                const hasEmergency = notice.includes('응급') || row.사업장명.includes('응급');
                const hasParking = notice.includes('주차') || notice.includes('parking');

                // Extract opening hours from 공지
                const openingHours = this.extractOpeningHours(notice);

                // Generate unique business registration number (using index as fallback)
                const businessRegNumber = `999-99-${String(hospitals.length).padStart(5, '0')}`;

                const hospital: Partial<ParsedHospital> = {
                  name: row.사업장명,
                  roadAddress,
                  latitude: lat,
                  longitude: lng,
                  phoneNumber,
                  sido,
                  sigungu,
                  dong,
                  postalCode: '00000', // Default postal code (CSV doesn't have this)
                  status,
                  businessRegistrationNumber: businessRegNumber,
                  representativeName: '대표', // Default (CSV doesn't have this)
                  veterinaryLicenseNumber: 'VET-00000', // Default (CSV doesn't have this)
                  is24Hours,
                  hasEmergency,
                  hasParking,
                  openingHours,
                };

                hospitals.push(hospital);
              } catch (error) {
                console.error(`Error parsing row:`, row, error);
                skippedCount++;
              }
            }

            console.log(`✅ Parsed ${hospitals.length} hospitals from CSV`);
            console.log(`⚠️  Skipped ${skippedCount} invalid entries`);
            console.log(`📊 24-hour hospitals: ${hospitals.filter((h) => h.is24Hours).length}`);

            resolve(hospitals);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Format phone number to standard Korean format
   */
  private formatPhoneNumber(phone: string | null | undefined): string | null {
    if (!phone) return null;

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    if (digits.length === 0) return null;

    // Format based on length
    if (digits.startsWith('02')) {
      // Seoul landline: 02-XXXX-XXXX or 02-XXX-XXXX
      if (digits.length === 9) {
        return `02-${digits.substring(2, 5)}-${digits.substring(5)}`;
      } else if (digits.length === 10) {
        return `02-${digits.substring(2, 6)}-${digits.substring(6)}`;
      }
    } else if (digits.startsWith('0')) {
      // Other area codes: 0XX-XXXX-XXXX
      if (digits.length === 10) {
        return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
      } else if (digits.length === 11) {
        return `${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7)}`;
      }
    }

    // Return as-is if format doesn't match
    return phone;
  }

  /**
   * Extract opening hours from notice field
   */
  private extractOpeningHours(notice: string): string | null {
    if (!notice) return null;

    // Look for time patterns like "09:00~18:00" or "9시-18시"
    const timePattern = /(\d{1,2}):?(\d{2})?\s*[~-]\s*(\d{1,2}):?(\d{2})?/;
    const match = notice.match(timePattern);

    if (match) {
      return match[0];
    }

    // Look for Korean time format "9시-18시"
    const koreanTimePattern = /(\d{1,2})시\s*[-~]\s*(\d{1,2})시/;
    const koreanMatch = notice.match(koreanTimePattern);

    if (koreanMatch) {
      return koreanMatch[0];
    }

    return null;
  }
}

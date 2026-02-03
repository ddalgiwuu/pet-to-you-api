/**
 * Dog Breed CSV Parser
 * Parses Korean dog breed data categorized by consonant (ㄱ-ㅎ)
 */

import * as fs from 'fs';
import * as Papa from 'papaparse';
import { DogBreed, DogSize } from '../../modules/pets/entities/dog-breed.entity';

interface BreedCsvRow {
  category: string; // ㄱ, ㄴ, ㄷ, etc.
  breeds: string; // Comma-separated: 말티즈, 말라뮤트, 말라무트
}

// Popular breeds for special marking
const POPULAR_BREEDS = [
  '말티즈',
  '푸들',
  '시바견',
  '웰시코기',
  '포메라니안',
  '치와와',
  '비글',
  '불독',
  '리트리버',
  '진돗개',
  '시츄',
  '요크셔테리어',
  '닥스훈트',
  '보더콜리',
  '허스키',
];

// English breed name mapping (common breeds)
const KOREAN_TO_ENGLISH: Record<string, string> = {
  말티즈: 'Maltese',
  푸들: 'Poodle',
  시바견: 'Shiba Inu',
  웰시코기: 'Welsh Corgi',
  포메라니안: 'Pomeranian',
  치와와: 'Chihuahua',
  비글: 'Beagle',
  불독: 'Bulldog',
  리트리버: 'Retriever',
  진돗개: 'Jindo',
  시츄: 'Shih Tzu',
  요크셔테리어: 'Yorkshire Terrier',
  닥스훈트: 'Dachshund',
  보더콜리: 'Border Collie',
  허스키: 'Husky',
  사모예드: 'Samoyed',
  골든리트리버: 'Golden Retriever',
  래브라도: 'Labrador',
  저먼셰퍼드: 'German Shepherd',
  비숑프리제: 'Bichon Frise',
  슈나우저: 'Schnauzer',
  코카스파니엘: 'Cocker Spaniel',
  달마시안: 'Dalmatian',
  도베르만: 'Doberman',
  로트와일러: 'Rottweiler',
  복서: 'Boxer',
  그레이하운드: 'Greyhound',
  아키타: 'Akita',
  차우차우: 'Chow Chow',
  페키니즈: 'Pekingese',
};

// Estimate size based on breed name keywords
function estimateSize(nameKorean: string): DogSize {
  const name = nameKorean.toLowerCase();

  // Extra small: ~3kg
  if (
    name.includes('치와와') ||
    name.includes('요크셔') ||
    name.includes('포메') ||
    name.includes('티컵') ||
    name.includes('말티즈')
  ) {
    return DogSize.EXTRA_SMALL;
  }

  // Small: 3-10kg
  if (
    name.includes('닥스') ||
    name.includes('시츄') ||
    name.includes('푸들') ||
    name.includes('페키') ||
    name.includes('파피') ||
    name.includes('테리어')
  ) {
    return DogSize.SMALL;
  }

  // Large: 25-45kg
  if (
    name.includes('리트리버') ||
    name.includes('셰퍼드') ||
    name.includes('로트') ||
    name.includes('도베르만') ||
    name.includes('복서')
  ) {
    return DogSize.LARGE;
  }

  // Extra large: 45kg+
  if (
    name.includes('마스티프') ||
    name.includes('세인트') ||
    name.includes('그레이트') ||
    name.includes('뉴펀들랜드') ||
    name.includes('아이리시')
  ) {
    return DogSize.EXTRA_LARGE;
  }

  // Default to medium
  return DogSize.MEDIUM;
}

// Get English name
function getEnglishName(nameKorean: string): string {
  return KOREAN_TO_ENGLISH[nameKorean] || nameKorean;
}

export class BreedCsvParser {
  /**
   * Parse breed CSV file
   * @param csvPath - Absolute path to CSV file
   * @returns Array of DogBreed entities ready for insertion
   */
  async parse(csvPath: string): Promise<Partial<DogBreed>[]> {
    return new Promise((resolve, reject) => {
      const breeds: Partial<DogBreed>[] = [];

      const fileContent = fs.readFileSync(csvPath, 'utf-8');

      Papa.parse<BreedCsvRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            for (const row of results.data) {
              if (!row.category || !row.breeds) continue;

              const category = row.category.trim();

              // Split breeds by comma
              const breedNames = row.breeds
                .split(',')
                .map((b) => b.trim())
                .filter((b) => b.length > 0);

              for (const nameKorean of breedNames) {
                const breed: Partial<DogBreed> = {
                  nameKorean,
                  nameEnglish: getEnglishName(nameKorean),
                  category,
                  size: estimateSize(nameKorean),
                  isPopular: POPULAR_BREEDS.includes(nameKorean),
                  characteristics: null,
                  averageWeightKg: null,
                  imageUrl: null,
                  description: null,
                };

                breeds.push(breed);
              }
            }

            console.log(`✅ Parsed ${breeds.length} dog breeds from CSV`);
            console.log(`📊 Popular breeds: ${breeds.filter((b) => b.isPopular).length}`);

            resolve(breeds);
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
}

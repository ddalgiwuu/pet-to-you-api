/**
 * Cat Breed CSV Parser
 * Parses Korean cat breed data categorized by consonant (ㄱ-ㅎ)
 */

import * as fs from 'fs';
import * as Papa from 'papaparse';
import { CatBreed, CatSize } from '../../modules/pets/entities/cat-breed.entity';

interface BreedCsvRow {
  구분: string; // ㄱ, ㄴ, ㄷ, etc.
  품종: string; // Comma-separated breeds
}

// Popular cat breeds in Korea
const POPULAR_BREEDS = [
  '코리안 숏헤어',
  '페르시안',
  '러시안 블루',
  '스코티시 폴드',
  '브리티시 숏헤어',
  '먼치킨',
  '메인쿤',
  '뱅골',
  '샴',
  '노르웨이 숲',
  '아비시니안',
  '렉돌',
  '터키시 앙고라',
  '스핑크스',
  '아메리칸 숏헤어',
];

// Korean to English mapping
const KOREAN_TO_ENGLISH: Record<string, string> = {
  '코리안 숏헤어': 'Korean Shorthair',
  페르시안: 'Persian',
  '러시안 블루': 'Russian Blue',
  '스코티시 폴드': 'Scottish Fold',
  '스코티시 스트레이트': 'Scottish Straight',
  '브리티시 숏헤어': 'British Shorthair',
  '브리티시 롱헤어': 'British Longhair',
  먼치킨: 'Munchkin',
  메인쿤: 'Maine Coon',
  벵골: 'Bengal',
  샴: 'Siamese',
  '노르웨이 숲': 'Norwegian Forest',
  아비시니안: 'Abyssinian',
  렉돌: 'Ragdoll',
  '터키시 앙고라': 'Turkish Angora',
  스핑크스: 'Sphynx',
  '아메리칸 숏헤어': 'American Shorthair',
  '아메리칸 컬': 'American Curl',
  믹스: 'Mixed',
  버만: 'Birman',
  버미즈: 'Burmese',
  발리니즈: 'Balinese',
  사바나: 'Savannah',
  샤르트뢰: 'Chartreux',
  소말리: 'Somali',
  싱가푸라: 'Singapura',
  히말라얀: 'Himalayan',
  '엑조틱 숏헤어': 'Exotic Shorthair',
  '오리엔탈 숏헤어': 'Oriental Shorthair',
  '이집션 마우': 'Egyptian Mau',
};

// Estimate size based on breed name
function estimateSize(nameKorean: string): CatSize {
  const name = nameKorean.toLowerCase();

  // Small cats (under 3kg)
  if (name.includes('싱가푸라') || name.includes('먼치킨') || name.includes('데본')) {
    return CatSize.SMALL;
  }

  // Large cats (5-7kg)
  if (
    name.includes('브리티시') ||
    name.includes('렉돌') ||
    name.includes('노르웨이') ||
    name.includes('버만')
  ) {
    return CatSize.LARGE;
  }

  // Extra large (7kg+)
  if (
    name.includes('메인쿤') ||
    name.includes('사바나') ||
    name.includes('래그') ||
    name.includes('시베리안')
  ) {
    return CatSize.EXTRA_LARGE;
  }

  // Default to medium
  return CatSize.MEDIUM;
}

function getEnglishName(nameKorean: string): string {
  return KOREAN_TO_ENGLISH[nameKorean] || nameKorean;
}

export class CatBreedCsvParser {
  async parse(csvPath: string): Promise<Partial<CatBreed>[]> {
    return new Promise((resolve, reject) => {
      const breeds: Partial<CatBreed>[] = [];

      const fileContent = fs.readFileSync(csvPath, 'utf-8');

      Papa.parse<BreedCsvRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            for (const row of results.data) {
              if (!row.구분 || !row.품종) continue;

              const category = row.구분.trim();

              // Split breeds by comma
              const breedNames = row.품종
                .split(',')
                .map((b) => b.trim())
                .filter((b) => b.length > 0);

              for (const nameKorean of breedNames) {
                const breed: Partial<CatBreed> = {
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

            console.log(`✅ Parsed ${breeds.length} cat breeds from CSV`);
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

/**
 * DogBreed Entity
 * Stores comprehensive dog breed information for Pet to You platform
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DogSize {
  EXTRA_SMALL = 'extra_small', // ~3kg
  SMALL = 'small', // 3-10kg
  MEDIUM = 'medium', // 10-25kg
  LARGE = 'large', // 25-45kg
  EXTRA_LARGE = 'extra_large', // 45kg+
}

@Entity('dog_breeds')
@Index(['category'])
@Index(['nameKorean'])
@Index(['nameEnglish'])
@Index(['isPopular'])
export class DogBreed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nameKorean: string; // 말티즈

  @Column({ type: 'varchar', length: 100 })
  nameEnglish: string; // Maltese

  @Column({ type: 'char', length: 1 })
  category: string; // ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅅ, ㅇ, ㅈ, ㅊ, ㅋ, ㅌ, ㅍ, ㅎ

  @Column({
    type: 'enum',
    enum: DogSize,
    default: DogSize.MEDIUM,
  })
  size: DogSize;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averageWeightKg: number | null; // Average weight in kilograms

  @Column({ type: 'simple-array', nullable: true })
  characteristics: string[] | null; // ['활발함', '친근함', '지능적']

  @Column({ type: 'boolean', default: false })
  isPopular: boolean; // Mark popular breeds for filtering

  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null; // Brief breed description

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

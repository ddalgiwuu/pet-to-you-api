/**
 * CatBreed Entity
 * Stores comprehensive cat breed information
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CatSize {
  SMALL = 'small', // ~3kg
  MEDIUM = 'medium', // 3-5kg
  LARGE = 'large', // 5-7kg
  EXTRA_LARGE = 'extra_large', // 7kg+
}

@Entity('cat_breeds')
@Index(['category'])
@Index(['nameKorean'])
@Index(['nameEnglish'])
@Index(['isPopular'])
export class CatBreed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nameKorean: string; // 코리안 숏헤어

  @Column({ type: 'varchar', length: 100 })
  nameEnglish: string; // Korean Shorthair

  @Column({ type: 'char', length: 1 })
  category: string; // ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅅ, ㅇ, ㅈ, ㅊ, ㅋ, ㅌ, ㅍ, ㅎ

  @Column({
    type: 'enum',
    enum: CatSize,
    default: CatSize.MEDIUM,
  })
  size: CatSize;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averageWeightKg: number | null;

  @Column({ type: 'simple-array', nullable: true })
  characteristics: string[] | null; // ['온순함', '독립적', '조용함']

  @Column({ type: 'boolean', default: false })
  isPopular: boolean;

  @Column({ type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

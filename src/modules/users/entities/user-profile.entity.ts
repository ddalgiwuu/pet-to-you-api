import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  // ============================================================
  // Address Information
  // ============================================================

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string; // 주소

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string; // 시/도

  @Column({ type: 'varchar', length: 100, nullable: true })
  district?: string; // 구/군

  @Column({ type: 'varchar', length: 10, nullable: true })
  postalCode?: string; // 우편번호

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  // ============================================================
  // Emergency Contact
  // ============================================================

  @Column({ type: 'varchar', length: 100, nullable: true })
  emergencyContactName?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  emergencyContactPhone?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  emergencyContactRelation?: string; // 관계 (가족, 친구 등)

  // ============================================================
  // Preferences
  // ============================================================

  @Column({ type: 'varchar', length: 10, default: 'ko' })
  language: string; // 'ko', 'en'

  @Column({ type: 'varchar', length: 50, default: 'Asia/Seoul' })
  timezone: string;

  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  smsNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  pushNotifications: boolean;

  @Column({ type: 'jsonb', nullable: true })
  notificationPreferences?: {
    bookingReminders: boolean;
    promotions: boolean;
    healthReminders: boolean;
    adoptionUpdates: boolean;
  };

  // ============================================================
  // Additional Information
  // ============================================================

  @Column({ type: 'text', nullable: true })
  bio?: string; // 자기소개

  @Column({ type: 'varchar', length: 255, nullable: true })
  occupation?: string; // 직업

  @Column({ type: 'simple-array', nullable: true })
  interests?: string[]; // 관심사 태그

  // ============================================================
  // Timestamps
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

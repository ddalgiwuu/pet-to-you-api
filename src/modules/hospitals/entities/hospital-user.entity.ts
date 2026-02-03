/**
 * Hospital User Entity
 * Hospital staff authentication and role management
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Hospital } from './hospital.entity';

export enum HospitalUserRole {
  OWNER = 'owner',           // 병원장 (모든 권한)
  ADMIN = 'admin',           // 관리자 (직원 관리 제외 모든 권한)
  STAFF = 'staff',           // 직원 (진료 기록 작성)
  RECEPTIONIST = 'receptionist', // 접수 (예약 관리만)
}

/**
 * 🏥 Hospital User Entity
 *
 * 병원 직원 계정 및 권한 관리
 *
 * Roles:
 * - owner: 병원장 (모든 권한)
 * - admin: 관리자 (직원 관리 제외 모든 권한)
 * - staff: 직원 (진료 기록 작성, 예약 관리)
 * - receptionist: 접수 (예약 관리만)
 */
@Entity('hospital_users')
@Index(['hospitalId', 'email'], { unique: true })
@Index(['hospitalId', 'role'])
@Index(['email'])
export class HospitalUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Hospital Relationship
  // ============================================================

  @ManyToOne(() => Hospital, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ type: 'uuid' })
  @Index()
  hospitalId: string;

  // ============================================================
  // User Information
  // ============================================================

  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  // ============================================================
  // Role & Permissions
  // ============================================================

  @Column({
    type: 'enum',
    enum: HospitalUserRole,
    default: HospitalUserRole.STAFF,
  })
  role: HospitalUserRole;

  @Column({ type: 'simple-array', nullable: true })
  permissions?: string[]; // Custom permissions for fine-grained control

  // ============================================================
  // Professional Information
  // ============================================================

  @Column({ type: 'varchar', length: 100, nullable: true })
  title?: string; // 직책 (예: "원장", "수의사", "간호사")

  @Column({ type: 'varchar', length: 50, nullable: true })
  veterinarianLicense?: string; // 수의사 면허번호

  @Column({ type: 'varchar', length: 100, nullable: true })
  specialization?: string; // 전문 분야

  // ============================================================
  // Status
  // ============================================================

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastLoginIp?: string;

  // ============================================================
  // Security
  // ============================================================

  @Column({ type: 'text', nullable: true })
  refreshToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  refreshTokenExpiresAt?: Date;

  @Column({ type: 'integer', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  // ============================================================
  // Metadata
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date; // Soft delete
}

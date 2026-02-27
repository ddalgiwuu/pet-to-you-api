import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export enum UserRole {
  CONSUMER = 'consumer',           // 일반 사용자 (반려동물 보호자)
  HOSPITAL_STAFF = 'hospital_staff', // 병원 직원
  HOSPITAL_ADMIN = 'hospital_admin', // 병원 관리자
  SHELTER_ADMIN = 'shelter_admin',   // 보호소 관리자
  DAYCARE_ADMIN = 'daycare_admin',   // 유치원 관리자
  PLATFORM_ADMIN = 'platform_admin', // 플랫폼 관리자
  SUPER_ADMIN = 'super_admin',       // 슈퍼 관리자
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
@Index(['phoneNumber'])
@Index(['role', 'status'])
export class User {
  // Note: email index created automatically by UNIQUE constraint (removed duplicate @Index)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Authentication Fields
  // ============================================================

  // Removed duplicate @Index() - unique constraint already creates index
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailHmac?: string; // 🔍 Searchable encryption index (HMAC of email)

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash?: string; // 🔒 bcrypt hash (for email/password auth)

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string; // Format: 010-1234-5678

  @Column({ type: 'varchar', length: 255, nullable: true })
  phoneNumberHmac?: string; // 🔍 Searchable encryption index

  // Removed duplicate @Index() - already part of class-level @Index(['role', 'status'])
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CONSUMER,
  })
  role: UserRole;

  // Removed duplicate @Index() - already part of class-level @Index(['role', 'status'])
  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.PENDING_VERIFICATION,
  })
  status: AccountStatus;

  // ============================================================
  // OAuth2 Fields
  // ============================================================

  @Column({ type: 'varchar', length: 50, nullable: true })
  oauthProvider?: string; // 'kakao', 'naver', 'apple', 'google'

  @Column({ type: 'varchar', length: 255, nullable: true })
  oauthId?: string; // Provider's user ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  oauthAccessToken?: string; // 🔒 Should be encrypted in production

  @Column({ type: 'timestamp', nullable: true })
  oauthTokenExpiry?: Date;

  // ============================================================
  // Profile Fields
  // ============================================================

  @Column({ type: 'varchar', length: 100 })
  name: string; // 사용자 이름

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImageUrl?: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender?: string; // 'M', 'F', 'Other'

  // ============================================================
  // Security & Compliance Fields
  // ============================================================

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean; // 🔒 2FA (TOTP)

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  twoFactorSecret?: string; // 🔒 TOTP secret (encrypted)

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  lastLoginIp?: string;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number; // Track for account lockout

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil?: Date; // Account lockout until this time

  // ============================================================
  // Role-Specific Fields
  // ============================================================

  @Column({ type: 'uuid', nullable: true })
  hospitalId?: string; // For hospital staff/admin users

  @Column({ type: 'uuid', nullable: true })
  businessId?: string; // For daycare/shelter/grooming admin users

  @Column({ type: 'varchar', length: 50, nullable: true })
  businessType?: string; // 'daycare', 'shelter', 'grooming_salon'

  @Column({ nullable: true })
  deviceToken: string;

  @Column({ nullable: true })
  deviceTokenUpdatedAt: Date;

  // ============================================================
  // Consent & Privacy (PIPA Compliance)
  // ============================================================

  @Column({ type: 'boolean', default: false })
  termsAccepted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  termsAcceptedAt?: Date;

  @Column({ type: 'boolean', default: false })
  privacyPolicyAccepted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  privacyPolicyAcceptedAt?: Date;

  @Column({ type: 'boolean', default: false })
  marketingConsent: boolean; // 마케팅 수신 동의

  @Column({ type: 'timestamp', nullable: true })
  marketingConsentAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  consentHistory?: Array<{
    type: string;
    accepted: boolean;
    timestamp: Date;
    ipAddress: string;
  }>;

  // ============================================================
  // Soft Delete & Timestamps
  // ============================================================

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================================
  // Relations (to be added)
  // ============================================================

  // @OneToMany(() => Pet, (pet) => pet.owner)
  // pets: Pet[];

  // @OneToMany(() => Booking, (booking) => booking.user)
  // bookings: Booking[];

  // ============================================================
  // Entity Lifecycle Hooks
  // ============================================================

  @BeforeInsert()
  @BeforeUpdate()
  setDefaults() {
    // Normalize email to lowercase
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }

    // Format phone number
    if (this.phoneNumber) {
      this.phoneNumber = this.phoneNumber.replace(/[^0-9]/g, '');
    }
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Check if user has admin privileges
   */
  isAdmin(): boolean {
    return [
      UserRole.PLATFORM_ADMIN,
      UserRole.SUPER_ADMIN,
    ].includes(this.role);
  }

  /**
   * Check if account is locked
   */
  isLocked(): boolean {
    if (!this.lockedUntil) return false;
    return new Date() < this.lockedUntil;
  }

  /**
   * Check if account is active
   */
  isActive(): boolean {
    return (
      this.status === AccountStatus.ACTIVE &&
      !this.isDeleted &&
      !this.isLocked()
    );
  }

  /**
   * Sanitize user data for API response (remove sensitive fields)
   */
  toJSON() {
    const { passwordHash, twoFactorSecret, oauthAccessToken, emailHmac, phoneNumberHmac, ...safe } = this;
    return safe;
  }
}

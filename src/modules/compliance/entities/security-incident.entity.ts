import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 🚨 Security Incident Entity
 *
 * PIPA Article 34: Security Breach Documentation
 *
 * Tracks all security incidents and breach notifications
 * Required for regulatory compliance and incident response
 */
@Entity('security_incidents')
export class SecurityIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: [
      'unauthorized_access',
      'data_leak',
      'ransomware',
      'insider_threat',
      'system_compromise',
      'medical_data_breach',
    ],
  })
  type: string;

  @Column('text')
  description: string;

  @Column('simple-array')
  affectedDataTypes: string[];

  @Column('int', { default: 0 })
  affectedUserCount: number;

  @Column('timestamp')
  discoveredAt: Date;

  @Column('timestamp')
  reportedAt: Date;

  @Column('varchar', { length: 255 })
  detectedBy: string;

  @Column({
    type: 'enum',
    enum: ['critical', 'high', 'medium', 'low'],
  })
  severity: string;

  @Column({
    type: 'enum',
    enum: ['contained', 'in_progress', 'uncontained'],
  })
  containmentStatus: string;

  @Column('text')
  estimatedImpact: string;

  @Column('boolean', { default: false })
  authoritiesNotified: boolean;

  @Column('timestamp', { nullable: true })
  authoritiesNotifiedAt: Date | null;

  @Column('boolean', { default: false })
  usersNotified: boolean;

  @Column('timestamp', { nullable: true })
  usersNotifiedAt: Date | null;

  @Column('int', { default: 0 })
  usersNotifiedCount: number;

  @Column({
    type: 'enum',
    enum: ['investigating', 'contained', 'resolved', 'closed'],
    default: 'investigating',
  })
  status: string;

  @Column('text', { nullable: true })
  resolutionNotes: string | null;

  @Column('timestamp', { nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

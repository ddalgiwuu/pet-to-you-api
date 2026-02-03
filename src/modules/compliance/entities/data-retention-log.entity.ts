import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

/**
 * 📅 Data Retention Log Entity
 *
 * Tracks all data retention actions:
 * - Archival (hot → warm storage)
 * - Cold storage (warm → cold storage)
 * - Secure deletion (permanent removal)
 *
 * Required for compliance audits and retention policy verification
 */
@Entity('data_retention_logs')
export class DataRetentionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  recordType: string; // e.g., 'health_note', 'payment', 'booking'

  @Column('varchar', { length: 255 })
  recordId: string; // Original record ID

  @Column({
    type: 'enum',
    enum: ['ARCHIVED', 'COLD_STORAGE', 'SECURE_DELETE'],
  })
  action: 'ARCHIVED' | 'COLD_STORAGE' | 'SECURE_DELETE';

  @Column('varchar', { length: 255 })
  retentionPolicy: string; // e.g., '10 years (의료법 Article 22)'

  @Column('varchar', { length: 255, nullable: true })
  storageLocation: string | null; // e.g., 'warm_storage', 's3_glacier'

  @Column('text', { nullable: true })
  deletionReason: string | null; // Reason for deletion

  @CreateDateColumn()
  timestamp: Date;
}

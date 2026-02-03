import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePaymentTables1737120000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payments table
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'resource_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'resource_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'payment_number',
            type: 'varchar',
            length: '30',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'enum',
            enum: ['KRW'],
            default: "'KRW'",
          },
          {
            name: 'payment_method',
            type: 'enum',
            enum: ['card', 'transfer', 'virtual_account', 'mobile'],
            isNullable: false,
          },
          {
            name: 'provider',
            type: 'enum',
            enum: ['toss_payments'],
            default: "'toss_payments'",
          },
          {
            name: 'transaction_id',
            type: 'varchar',
            length: '200',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'order_id',
            type: 'varchar',
            length: '200',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'customer_key',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'card_company',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'card_last_four_digits',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'card_type',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'virtual_account_number',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'virtual_account_bank',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'virtual_account_expire_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'ready', 'in_progress', 'completed', 'failed', 'refunded', 'partial_refunded', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'requested_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refunded_amount',
            type: 'int',
            default: 0,
          },
          {
            name: 'refunded_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refund_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refund_transaction_id',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'receipt_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'approval_number',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'webhook_signature',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'webhook_received_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'webhook_retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '200',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'is_deleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create payment_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'payment_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'payment_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'payment_request',
              'payment_approval',
              'payment_confirmation',
              'payment_cancellation',
              'refund_request',
              'refund_approval',
              'webhook_received',
            ],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'failed', 'pending'],
            isNullable: false,
          },
          {
            name: 'request_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'response_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'http_status_code',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'http_method',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'endpoint',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'error_code',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_details',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'processing_time_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'requested_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'responded_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'transaction_id',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'retry_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'original_transaction_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for payments table
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_PAYMENTS_USER_STATUS_CREATED',
        columnNames: ['user_id', 'status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_PAYMENTS_RESOURCE',
        columnNames: ['resource_type', 'resource_id'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_PAYMENTS_TRANSACTION_ID',
        columnNames: ['transaction_id'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_PAYMENTS_STATUS_CREATED',
        columnNames: ['status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_PAYMENTS_USER_ID',
        columnNames: ['user_id'],
      }),
    );

    // Create indexes for payment_transactions table
    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_PAYMENT_TRANSACTIONS_PAYMENT_CREATED',
        columnNames: ['payment_id', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_PAYMENT_TRANSACTIONS_TYPE_STATUS',
        columnNames: ['type', 'status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_PAYMENT_TRANSACTIONS_PAYMENT_ID',
        columnNames: ['payment_id'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'payment_transactions',
      new TableForeignKey({
        columnNames: ['payment_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'payments',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const paymentsTable = await queryRunner.getTable('payments');
    const paymentTransactionsTable = await queryRunner.getTable('payment_transactions');

    // Drop foreign keys
    if (paymentTransactionsTable) {
      const paymentTransactionsForeignKey = paymentTransactionsTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('payment_id') !== -1,
      );
      if (paymentTransactionsForeignKey) {
        await queryRunner.dropForeignKey('payment_transactions', paymentTransactionsForeignKey);
      }
    }

    if (paymentsTable) {
      const paymentsForeignKey = paymentsTable.foreignKeys.find(
        fk => fk.columnNames.indexOf('user_id') !== -1,
      );
      if (paymentsForeignKey) {
        await queryRunner.dropForeignKey('payments', paymentsForeignKey);
      }
    }

    // Drop tables
    await queryRunner.dropTable('payment_transactions');
    await queryRunner.dropTable('payments');
  }
}

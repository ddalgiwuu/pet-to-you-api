/**
 * Migration: Create Cat Breed Table
 * Creates table for storing cat breeds with Korean categorization
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCatBreedTable1737201000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cat_breeds',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nameKorean',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'nameEnglish',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'char',
            length: '1',
            isNullable: false,
          },
          {
            name: 'size',
            type: 'enum',
            enum: ['small', 'medium', 'large', 'extra_large'],
            default: `'medium'`,
            isNullable: false,
          },
          {
            name: 'averageWeightKg',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'characteristics',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isPopular',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'imageUrl',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'cat_breeds',
      new TableIndex({
        name: 'IDX_cat_breeds_category',
        columnNames: ['category'],
      })
    );

    await queryRunner.createIndex(
      'cat_breeds',
      new TableIndex({
        name: 'IDX_cat_breeds_nameKorean',
        columnNames: ['nameKorean'],
      })
    );

    await queryRunner.createIndex(
      'cat_breeds',
      new TableIndex({
        name: 'IDX_cat_breeds_isPopular',
        columnNames: ['isPopular'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('cat_breeds', 'IDX_cat_breeds_category');
    await queryRunner.dropIndex('cat_breeds', 'IDX_cat_breeds_nameKorean');
    await queryRunner.dropIndex('cat_breeds', 'IDX_cat_breeds_isPopular');
    await queryRunner.dropTable('cat_breeds');
  }
}

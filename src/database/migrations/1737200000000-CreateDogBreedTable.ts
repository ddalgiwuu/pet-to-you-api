/**
 * Migration: Create Dog Breed Table
 * Creates table for storing 300+ dog breeds with Korean categorization
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDogBreedTable1737200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create dog_breeds table
    await queryRunner.createTable(
      new Table({
        name: 'dog_breeds',
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
            comment: 'Korean consonant category: ㄱ, ㄴ, ㄷ, etc.',
          },
          {
            name: 'size',
            type: 'enum',
            enum: ['extra_small', 'small', 'medium', 'large', 'extra_large'],
            default: `'medium'`,
            isNullable: false,
          },
          {
            name: 'averageWeightKg',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
            comment: 'Average weight in kilograms',
          },
          {
            name: 'characteristics',
            type: 'text',
            isNullable: true,
            comment: 'Comma-separated list of characteristics',
          },
          {
            name: 'isPopular',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: 'Mark popular breeds for featured display',
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

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'dog_breeds',
      new TableIndex({
        name: 'IDX_dog_breeds_category',
        columnNames: ['category'],
      })
    );

    await queryRunner.createIndex(
      'dog_breeds',
      new TableIndex({
        name: 'IDX_dog_breeds_nameKorean',
        columnNames: ['nameKorean'],
      })
    );

    await queryRunner.createIndex(
      'dog_breeds',
      new TableIndex({
        name: 'IDX_dog_breeds_nameEnglish',
        columnNames: ['nameEnglish'],
      })
    );

    await queryRunner.createIndex(
      'dog_breeds',
      new TableIndex({
        name: 'IDX_dog_breeds_isPopular',
        columnNames: ['isPopular'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('dog_breeds', 'IDX_dog_breeds_category');
    await queryRunner.dropIndex('dog_breeds', 'IDX_dog_breeds_nameKorean');
    await queryRunner.dropIndex('dog_breeds', 'IDX_dog_breeds_nameEnglish');
    await queryRunner.dropIndex('dog_breeds', 'IDX_dog_breeds_isPopular');

    // Drop table
    await queryRunner.dropTable('dog_breeds');
  }
}

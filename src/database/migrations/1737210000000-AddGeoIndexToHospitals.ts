/**
 * Migration: Add PostGIS Spatial Index to Hospitals
 * Adds geometry column and spatial index for efficient nearby search
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGeoIndexToHospitals1737210000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable PostGIS extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // 2. Add geometry column (SRID 4326 = WGS84 lat/lng)
    await queryRunner.query(`
      ALTER TABLE hospitals
      ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);
    `);

    // 3. Update geometry column from existing latitude/longitude
    await queryRunner.query(`
      UPDATE hospitals
      SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude BETWEEN -90 AND 90
        AND longitude BETWEEN -180 AND 180;
    `);

    // 4. Create spatial index (GIST) for fast distance queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hospitals_location
      ON hospitals USING GIST (location);
    `);

    // 5. Create compound index for regional filtering (sido + sigungu)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hospitals_sido_sigungu
      ON hospitals (sido, sigungu);
    `);

    // 6. Create index for business status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_hospitals_status
      ON hospitals (status)
      WHERE status = 'active';
    `);

    // 7. Add helpful columns if they don't exist
    await queryRunner.query(`
      ALTER TABLE hospitals
      ADD COLUMN IF NOT EXISTS sido VARCHAR(50);
    `);

    await queryRunner.query(`
      ALTER TABLE hospitals
      ADD COLUMN IF NOT EXISTS sigungu VARCHAR(50);
    `);

    await queryRunner.query(`
      ALTER TABLE hospitals
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hospitals_location;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hospitals_sido_sigungu;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_hospitals_status;`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE hospitals DROP COLUMN IF EXISTS location;`);
    await queryRunner.query(`ALTER TABLE hospitals DROP COLUMN IF EXISTS sido;`);
    await queryRunner.query(`ALTER TABLE hospitals DROP COLUMN IF EXISTS sigungu;`);
    await queryRunner.query(`ALTER TABLE hospitals DROP COLUMN IF EXISTS status;`);

    // Note: We don't drop the PostGIS extension in case other tables use it
  }
}

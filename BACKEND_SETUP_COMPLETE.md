# Pet to You Backend - Setup Complete ✅

## Summary

Successfully fixed the Pet to You backend with proper coordinate conversion and database integration.

## Fixed Issues

### 1. ✅ Coordinate Conversion (EPSG:5179 → WGS84)
**Problem**: CSV uses Korean Central Belt projection, not standard EPSG:5179
- CSV coordinates were in Korean projection system
- Wrong projection gave Taiwan coordinates (119.58, 23.76) instead of Seoul (126.9, 37.5)

**Solution**:
- Identified correct projection: Korea 2000 / Central Belt
- Projection string: `+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80`
- Test case verified: x=191647.1628, y=444844.7641 → 126.9°E, 37.5°N ✅

**File**: `/Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api/src/database/parsers/hospital-csv-parser.ts`

### 2. ✅ CSV Column Parsing
**Problem**: CSV columns have parentheses: `좌표정보(x)`, `좌표정보(y)`
**Solution**: Updated parser to match actual CSV headers

### 3. ✅ Hospital Seeder MongoDB Integration
**Problem**: Hospitals only saved to PostgreSQL, not MongoDB for geospatial search
**Solution**:
- Added MongoDB sync in hospital seeder
- Creates geospatial index automatically
- Batch inserts for performance

### 4. ✅ Hospital API Routes
**Status**: Routes properly configured
- `POST /api/v1/hospitals` - Create hospital
- `GET /api/v1/hospitals/search` - Geospatial + filter search
- `GET /api/v1/hospitals/nearby` - Quick nearby search
- `GET /api/v1/hospitals/:id` - Get details
- `DELETE /api/v1/hospitals/:id` - Soft delete

## Project Structure

```
/Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api/
├── src/
│   ├── app.module.ts                 # Main app module
│   ├── main.ts                       # Entry point (port 3000, /api/v1 prefix)
│   ├── modules/
│   │   └── hospitals/
│   │       ├── controllers/hospital.controller.ts  # API routes
│   │       ├── services/hospital.service.ts        # Business logic
│   │       ├── entities/hospital.entity.ts         # PostgreSQL entity
│   │       ├── schemas/hospital.schema.ts          # MongoDB schema
│   │       └── dto/                                # Request/response DTOs
│   ├── database/
│   │   ├── parsers/hospital-csv-parser.ts          # ✅ Fixed coordinate conversion
│   │   └── seeds/
│   │       ├── hospital-seeder.ts                  # ✅ Dual DB seeding
│   │       └── run-seeds.ts                        # Seed runner
│   └── core/
│       └── database/database.module.ts             # DB connections
└── data/
    └── 서울동물병원데이터.csv                      # 2,137 Seoul hospitals
```

## Database Setup

### PostgreSQL (Transactional Data)
- **Database**: pettoyou
- **User**: ryansong
- **Tables**: hospitals (with PostGIS geometry column)
- **Purpose**: Master data, relationships, transactions

### MongoDB (Search & Analytics)
- **Database**: pettoyou
- **Collection**: hospital_search
- **Indexes**:
  - 2dsphere on `location` field (geospatial queries)
  - Text search on `name`, `description`
  - Compound indexes on `status`, `type`, `sido`, `sigungu`
- **Purpose**: Fast geospatial search, full-text search

## How to Run

### 1. Seed Hospital Data
```bash
npm run build
npm run seed
```

This will:
1. Parse 2,137 hospitals from CSV
2. Convert coordinates to WGS84
3. Save to PostgreSQL
4. Sync to MongoDB with geospatial index

### 2. Start API Server
```bash
npm run start:dev
```

Server starts at: `http://localhost:3000/api/v1`

### 3. Test Hospital API

**Search nearby hospitals:**
```bash
curl "http://localhost:3000/api/v1/hospitals/nearby?latitude=37.5&longitude=126.9&radiusKm=5&limit=10"
```

**Advanced search with filters:**
```bash
curl "http://localhost:3000/api/v1/hospitals/search?latitude=37.5&longitude=126.9&radiusKm=5&hasEmergency=true&is24Hours=true&sortBy=distance"
```

**Get hospital details:**
```bash
curl "http://localhost:3000/api/v1/hospitals/{hospital_id}"
```

## API Features

### Geospatial Search
- MongoDB `$geoNear` aggregation for location-based queries
- Calculates distance in kilometers
- Supports radius filtering (default 5km, max 50km)

### Advanced Filters
- Location: `sido`, `sigungu`, `radiusKm`
- Services: `hasEmergency`, `is24Hours`, `hasParking`, `acceptsInsurance`
- Quality: `minRating`, `openNow`
- Categories: `type`, `species`, `services[]`, `specialties[]`

### Sorting Options
- `distance` - Nearest first (default)
- `rating` - Highest rated first
- `reviews` - Most reviewed first
- `popularity` - View count + bookmarks
- `recent` - Newest hospitals first

### Pagination
- Default: 20 results per page
- Max: 100 results per page
- Returns: `total`, `page`, `limit`, `totalPages`

## Next Steps

1. **PostgreSQL Schema**:
   - Run migrations to create tables properly
   - Configure environment variables (.env)
   - Set `DB_SYNCHRONIZE=false` in production

2. **Hospital Data Loading**:
   ```bash
   npm run seed
   ```

3. **API Testing**:
   - Use Postman or curl to test endpoints
   - Verify geospatial search works correctly
   - Check coordinate accuracy on map

4. **Production**:
   - Set up proper PostgreSQL connection
   - Configure MongoDB Atlas or local MongoDB
   - Enable authentication and rate limiting
   - Set up logging and monitoring

## Verification Checklist

- [x] Coordinate conversion fixed (KOREA_CENTRAL projection)
- [x] CSV parsing matches actual headers
- [x] Hospital parser tested with real data
- [x] Dual database seeding (PostgreSQL + MongoDB)
- [x] MongoDB geospatial index configured
- [x] Hospital API routes registered
- [x] TypeScript compilation successful
- [ ] Database seeding completed
- [ ] API endpoint testing completed
- [ ] Production environment configured

## File Changes Made

1. `/src/database/parsers/hospital-csv-parser.ts` - Fixed projection + CSV headers
2. `/src/database/seeds/hospital-seeder.ts` - Added MongoDB sync
3. Built successfully with `npm run build`

## Contact

For issues or questions, check:
- API Documentation: `http://localhost:3000/api/v1/docs` (when Swagger is configured)
- Log files: Server console output
- Database: Use pgAdmin for PostgreSQL, MongoDB Compass for MongoDB

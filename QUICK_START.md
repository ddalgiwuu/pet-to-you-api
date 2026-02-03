# Pet to You Backend - Quick Start Guide 🚀

## Prerequisites Verified

✅ TypeScript compilation successful
✅ MongoDB connection working
✅ Coordinate conversion fixed

## Quick Start (3 Steps)

### Step 1: Configure Environment

Create `.env` file:

```bash
# Server
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=ryansong
DB_PASSWORD=your_password
DB_DATABASE=pettoyou
DB_SYNCHRONIZE=true

# MongoDB
MONGODB_URI=mongodb://localhost:27017/pettoyou

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:19006

# Security (use strong keys in production)
JWT_SECRET=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-32-characters
```

### Step 2: Seed Hospital Data

```bash
# Build the project
npm run build

# Run seeding (creates 2,137 hospitals)
npm run seed
```

**Expected Output:**
```
✅ Parsed 2,137 hospitals from CSV
✅ PostgreSQL Batch 1/5 inserted (500 records)
...
✅ MongoDB Batch 1/5 synced (500 records)
📊 MongoDB sync complete: 2,137 hospitals
```

### Step 3: Start Server

```bash
npm run start:dev
```

**Server URL:** `http://localhost:3000/api/v1`

## Test Hospitals API

### 1. Find Nearby Hospitals (Seoul Gangnam)

```bash
curl "http://localhost:3000/api/v1/hospitals/nearby?latitude=37.5172&longitude=127.0473&radiusKm=2&limit=5"
```

### 2. Search 24-hour Emergency Hospitals

```bash
curl "http://localhost:3000/api/v1/hospitals/search?latitude=37.5665&longitude=126.9780&radiusKm=5&hasEmergency=true&is24Hours=true&sortBy=distance"
```

### 3. Search by District

```bash
curl "http://localhost:3000/api/v1/hospitals/search?sido=서울특별시&sigungu=강남구&sortBy=rating&limit=10"
```

### 4. Full-Text Search

```bash
curl "http://localhost:3000/api/v1/hospitals/search?keyword=동물병원&limit=20"
```

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
pg_isready

# Create database if not exists
createdb pettoyou
```

### MongoDB Connection Issues

```bash
# Check MongoDB status
mongosh --eval "db.version()"

# Check if database exists
mongosh pettoyou --eval "db.stats()"
```

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Seeding Issues

```bash
# Clear existing data
mongosh pettoyou --eval "db.hospital_search.drop()"

# Re-run seeding
npm run build && npm run seed
```

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/hospitals` | Create new hospital (admin) |
| GET | `/hospitals/search` | Advanced search with filters |
| GET | `/hospitals/nearby` | Quick nearby search |
| GET | `/hospitals/:id` | Get hospital details |
| DELETE | `/hospitals/:id` | Soft delete (admin) |

## Search Parameters

- **Location**: `latitude`, `longitude`, `radiusKm` (default: 5)
- **Filters**: `hasEmergency`, `is24Hours`, `hasParking`, `acceptsInsurance`
- **Regions**: `sido`, `sigungu`, `dong`
- **Quality**: `minRating` (1-5), `openNow` (true/false)
- **Categories**: `type`, `species`, `services[]`, `specialties[]`
- **Sort**: `distance`, `rating`, `reviews`, `popularity`, `recent`
- **Pagination**: `page` (default: 1), `limit` (default: 20, max: 100)

## Example Response

```json
{
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "다움동물병원",
      "type": "general",
      "fullAddress": "서울특별시 영등포구 신길동 324-49 영민빌딩 1층",
      "phoneNumber": "02-831-0075",
      "latitude": 37.503031,
      "longitude": 126.905534,
      "distanceKm": 0.8,
      "averageRating": 4.5,
      "totalReviews": 128,
      "isCurrentlyOpen": true,
      "hasEmergency": false,
      "is24Hours": false
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

## Development Tips

1. **Hot Reload**: Use `npm run start:dev` for auto-reload
2. **Debug**: Use `npm run start:debug` and attach debugger
3. **Logs**: Check console for detailed query logs
4. **Testing**: Write tests in `test/` directory

## Need Help?

- Check `BACKEND_SETUP_COMPLETE.md` for detailed technical documentation
- Server logs provide detailed error messages
- Use MongoDB Compass to inspect geospatial data
- Use pgAdmin to manage PostgreSQL database

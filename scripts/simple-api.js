/**
 * Simple Express API Server
 * Provides endpoints for testing with real database data
 */

const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = 3001; // Use 3001 to avoid conflicts

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'ryansong',
  password: '',
  database: 'pet_to_you',
});

// Middleware
app.use(cors());
app.use(express.json());

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pet to You API is running' });
});

// Get nearby hospitals
app.get('/api/hospitals', async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 50 } = req.query;

    let query = `
      SELECT
        id,
        name,
        "roadAddress" as address,
        latitude,
        longitude,
        "phoneNumber" as phone,
        sido,
        sigungu,
        status,
        "is24Hours",
        "hasEmergency",
        "hasParking",
        services,
        "supportedSpecies"
      FROM hospitals
      WHERE status = 'active'
    `;

    const result = await client.query(query);
    let hospitals = result.rows;

    // If lat/lng provided, calculate distances and filter
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const maxRadius = parseFloat(radius);

      hospitals = hospitals.map(h => ({
        ...h,
        distance: calculateDistance(userLat, userLng, parseFloat(h.latitude), parseFloat(h.longitude))
      }))
      .filter(h => h.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance);
    }

    // Apply limit
    hospitals = hospitals.slice(0, parseInt(limit) || 50);

    res.json({
      success: true,
      data: hospitals,
      total: hospitals.length,
    });
  } catch (error) {
    console.error('Hospital API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get hospital by ID
app.get('/api/hospitals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      `SELECT
        id,
        name,
        "roadAddress" as address,
        latitude,
        longitude,
        "phoneNumber" as phone,
        sido,
        sigungu,
        status,
        "is24Hours",
        "hasEmergency",
        "hasParking",
        services,
        "supportedSpecies",
        "operatingHours"
      FROM hospitals
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Hospital not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get dog breeds
app.get('/api/breeds/dogs', async (req, res) => {
  try {
    const { category, popular, search } = req.query;

    let query = 'SELECT * FROM dog_breeds WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (popular === 'true') {
      query += ' AND "isPopular" = true';
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND ("nameKorean" ILIKE $${params.length} OR "nameEnglish" ILIKE $${params.length})`;
    }

    query += ' ORDER BY "nameKorean"';

    const result = await client.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cat breeds
app.get('/api/breeds/cats', async (req, res) => {
  try {
    const { category, popular, search } = req.query;

    let query = 'SELECT * FROM cat_breeds WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (popular === 'true') {
      query += ' AND "isPopular" = true';
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND ("nameKorean" ILIKE $${params.length} OR "nameEnglish" ILIKE $${params.length})`;
    }

    query += ' ORDER BY "nameKorean"';

    const result = await client.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get breed categories
app.get('/api/breeds/categories', async (req, res) => {
  try {
    const { species = 'dog' } = req.query;
    const table = species === 'cat' ? 'cat_breeds' : 'dog_breeds';

    const result = await client.query(`
      SELECT
        category,
        COUNT(*) as count
      FROM ${table}
      GROUP BY category
      ORDER BY category
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const dogCount = await client.query('SELECT COUNT(*) FROM dog_breeds');
    const catCount = await client.query('SELECT COUNT(*) FROM cat_breeds');
    const hospitalCount = await client.query('SELECT COUNT(*) FROM hospitals WHERE status = $1', ['active']);
    const hour24Count = await client.query('SELECT COUNT(*) FROM hospitals WHERE "is24Hours" = true');

    res.json({
      success: true,
      data: {
        dogBreeds: parseInt(dogCount.rows[0].count),
        catBreeds: parseInt(catCount.rows[0].count),
        hospitals: parseInt(hospitalCount.rows[0].count),
        emergency24h: parseInt(hour24Count.rows[0].count),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
async function startServer() {
  try {
    await client.connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`\n🚀 Pet to You Simple API Server`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📡 Server running on http://localhost:${PORT}`);
      console.log(`🏥 Hospitals: http://localhost:${PORT}/api/hospitals`);
      console.log(`🐕 Dog Breeds: http://localhost:${PORT}/api/breeds/dogs`);
      console.log(`🐱 Cat Breeds: http://localhost:${PORT}/api/breeds/cats`);
      console.log(`📊 Statistics: http://localhost:${PORT}/api/stats`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

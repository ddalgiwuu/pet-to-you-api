// MongoDB Initialization Script for Pet to You
// This script runs when the MongoDB container first starts

print('🚀 Initializing Pet to You MongoDB database...');

// Switch to pettoyou database
db = db.getSiblingDB('pettoyou');

// Create collections with validation schemas
db.createCollection('hospital_search', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['hospitalId', 'name', 'location', 'coordinates'],
      properties: {
        hospitalId: {
          bsonType: 'string',
          description: 'Hospital UUID from PostgreSQL',
        },
        name: {
          bsonType: 'string',
          description: 'Hospital name in Korean',
        },
        location: {
          bsonType: 'object',
          required: ['address', 'city', 'district'],
          properties: {
            address: { bsonType: 'string' },
            city: { bsonType: 'string' },
            district: { bsonType: 'string' },
          },
        },
        coordinates: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: {
              enum: ['Point'],
            },
            coordinates: {
              bsonType: 'array',
              minItems: 2,
              maxItems: 2,
              items: {
                bsonType: 'double',
              },
            },
          },
        },
        specialties: {
          bsonType: 'array',
          items: { bsonType: 'string' },
        },
        rating: {
          bsonType: 'double',
          minimum: 0,
          maximum: 5,
        },
      },
    },
  },
});

// Create geospatial index for location-based search
db.hospital_search.createIndex({ coordinates: '2dsphere' });
db.hospital_search.createIndex({ name: 'text' });
db.hospital_search.createIndex({ specialties: 1 });

print('✅ Created hospital_search collection with geospatial index');

// Create pet listings collection for adoption search
db.createCollection('pet_listings_search');
db.pet_listings_search.createIndex({ species: 1, age: 1, size: 1 });
db.pet_listings_search.createIndex({ shelterId: 1 });
db.pet_listings_search.createIndex({ createdAt: -1 });

print('✅ Created pet_listings_search collection');

// Create analytics collections
db.createCollection('user_events');
db.user_events.createIndex({ userId: 1, timestamp: -1 });
db.user_events.createIndex({ eventType: 1, timestamp: -1 });

print('✅ Created user_events collection for analytics');

// Create notification logs collection
db.createCollection('notification_logs');
db.notification_logs.createIndex({ userId: 1, sentAt: -1 });
db.notification_logs.createIndex({ type: 1, status: 1 });

print('✅ Created notification_logs collection');

// Set up TTL index for automatic cleanup (30 days for notifications)
db.notification_logs.createIndex(
  { sentAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days
);

print('✅ Set up TTL index for automatic cleanup');

print('🎉 MongoDB initialization complete!');
print('📦 Collections: hospital_search, pet_listings_search, user_events, notification_logs');
print('🗺️  Geospatial: 2dsphere index on hospital coordinates');
print('⏰ TTL: 30-day automatic cleanup for notifications');

#!/bin/bash

# MongoDB Atlas Connection Test Script
# Usage: ./test-mongodb-credentials.sh [username] [password]

echo "🔍 MongoDB Atlas Connection Test"
echo "================================"
echo ""

# Read credentials from arguments or prompt
if [ -z "$1" ]; then
  read -p "Enter MongoDB username: " USERNAME
else
  USERNAME="$1"
fi

if [ -z "$2" ]; then
  read -sp "Enter MongoDB password: " PASSWORD
  echo ""
else
  PASSWORD="$2"
fi

# URL encode password
ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('$PASSWORD'))")

# Construct connection string
CLUSTER="n3rve-db.ie22loh.mongodb.net"
DATABASE="pet-to-you"
URI="mongodb+srv://${USERNAME}:${ENCODED_PASSWORD}@${CLUSTER}/${DATABASE}?retryWrites=true&w=majority"

echo ""
echo "Testing connection..."
echo "Cluster: $CLUSTER"
echo "Database: $DATABASE"
echo "Username: $USERNAME"
echo ""

# Create test script
cat > /tmp/test-mongo.js << TESTEOF
const mongoose = require('mongoose');
const uri = process.env.MONGO_URI;

mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ SUCCESS: MongoDB connection established');
  console.log('Connected to database:', mongoose.connection.db.databaseName);
  console.log('');
  console.log('Update your .env file with:');
  console.log('MONGODB_URI=' + uri.replace(/:([^:@]+)@/, ':***@'));
  mongoose.connection.close();
  process.exit(0);
})
.catch(err => {
  console.error('❌ FAILED: MongoDB connection failed');
  console.error('Error:', err.message);
  console.error('Code:', err.code);
  console.error('');
  console.error('Common fixes:');
  console.error('1. Verify username and password in MongoDB Atlas → Database Access');
  console.error('2. Check user has permissions for database:', '${DATABASE}');
  console.error('3. Verify IP is whitelisted in Network Access');
  console.error('4. Try resetting the user password in MongoDB Atlas');
  process.exit(1);
});

setTimeout(() => {
  console.error('⏱️  Connection timeout after 10 seconds');
  process.exit(1);
}, 10000);
TESTEOF

# Run test
MONGO_URI="$URI" node /tmp/test-mongo.js

# Cleanup
rm -f /tmp/test-mongo.js

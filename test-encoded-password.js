// Test different password encodings
require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

console.log('Testing MongoDB connection with environment variable...');

console.log('\nTesting connection...');
mongoose.connect(mongoUri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB connection successful');
  console.log('Connected to database:', mongoose.connection.db.databaseName);
  mongoose.connection.close();
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB connection failed');
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Connection timeout');
  process.exit(1);
}, 15000);

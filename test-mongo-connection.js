require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

console.log('Testing MongoDB connection...');
console.log('URI:', uri.replace(/:[^:@]*@/, ':***@')); // Hide password in logs

mongoose.connect(uri, {
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
  console.error('❌ MongoDB connection failed:');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Full error:', JSON.stringify(err, null, 2));
  process.exit(1);
});

setTimeout(() => {
  console.error('Connection timeout after 10 seconds');
  process.exit(1);
}, 10000);

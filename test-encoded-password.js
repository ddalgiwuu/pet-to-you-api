// Test different password encodings
const password = '1EY0d2oKTCn2o5tp';
const encodedPassword = encodeURIComponent(password);

console.log('Original password:', password);
console.log('URL-encoded password:', encodedPassword);
console.log('Are they different?', password !== encodedPassword);

// Test connection with URL-encoded password
const mongoose = require('mongoose');
const uriEncoded = `mongodb+srv://wonseok9706_db_user:${encodedPassword}@n3rve-db.ie22loh.mongodb.net/pet-to-you?retryWrites=true&w=majority`;

console.log('\nTesting with URL-encoded password...');
mongoose.connect(uriEncoded, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connection successful with encoded password');
  mongoose.connection.close();
  process.exit(0);
})
.catch(err => {
  console.error('❌ Connection failed with encoded password:', err.message);
  
  // Try alternative: maybe user permissions issue
  console.log('\nTrying without database name specified...');
  const uriNoDb = `mongodb+srv://wonseok9706_db_user:${encodedPassword}@n3rve-db.ie22loh.mongodb.net/?retryWrites=true&w=majority`;
  
  return mongoose.connect(uriNoDb, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
})
.then(() => {
  console.log('✅ Connection successful without database name');
  console.log('Connected to:', mongoose.connection.db.databaseName || 'admin');
  mongoose.connection.close();
  process.exit(0);
})
.catch(err => {
  console.error('❌ All connection attempts failed');
  console.error('Error code:', err.code);
  console.error('Error message:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Connection timeout');
  process.exit(1);
}, 15000);

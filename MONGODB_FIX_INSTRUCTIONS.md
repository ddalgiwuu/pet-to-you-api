# MongoDB Atlas Authentication Fix Instructions

## Problem
MongoDB connection fails with: `bad auth : Authentication failed` (Error code 8000)

## Root Cause
Invalid MongoDB Atlas credentials. The user `wonseok9706_db_user` either:
- Doesn't exist in MongoDB Atlas
- Has an incorrect password
- Was deleted or disabled

## Fix Steps

### Option 1: Reset Existing User Password

1. Log into MongoDB Atlas: https://cloud.mongodb.com
2. Select your project
3. Navigate to: **Database Access** (left sidebar)
4. Find user: `wonseok9706_db_user`
5. Click **Edit** button
6. Click **Edit Password**
7. Generate or set a new password (save it securely!)
8. Click **Update User**

### Option 2: Create New User (if user doesn't exist)

1. Log into MongoDB Atlas: https://cloud.mongodb.com
2. Select your project
3. Navigate to: **Database Access** (left sidebar)
4. Click **Add New Database User**
5. Set Authentication Method: **Password**
6. Set username: `wonseok9706_db_user` (or any new username)
7. Generate or set a password (save it securely!)
8. Set Database User Privileges:
   - Built-in Role: **Read and write to any database**
   - OR custom role for specific database: `pet-to-you`
9. Click **Add User**

### Step 3: Update .env file

After getting the correct password from MongoDB Atlas, update your .env file:

```bash
# If password has special characters, URL-encode them:
# @ → %40
# : → %3A
# / → %2F
# ? → %3F
# # → %23
# [ → %5B
# ] → %5D
# & → %26
# = → %3D
# + → %2B

MONGODB_URI=mongodb+srv://wonseok9706_db_user:YOUR_NEW_PASSWORD@n3rve-db.ie22loh.mongodb.net/pet-to-you?retryWrites=true&w=majority
```

### Step 4: Test Connection

Run the test script:

```bash
node test-mongo-connection.js
```

Expected output: `✅ MongoDB connection successful`

### Step 5: Verify IP Whitelist (already done)

Current whitelisted IP: `121.162.140.75` ✅

If connecting from different IP, add it in:
**Network Access** → **Add IP Address** → Enter your IP or use `0.0.0.0/0` for development (not recommended for production)

## Common Issues

**Issue**: Password contains special characters
**Solution**: URL-encode the password before adding to connection string

**Issue**: User doesn't have permissions for `pet-to-you` database
**Solution**: Edit user in Database Access and grant permissions to `pet-to-you` database

**Issue**: IP not whitelisted
**Solution**: Add current IP address in Network Access section

## Testing

After fixing credentials, test with:

```bash
npm start
```

Look for: `✅ MongoDB connection successful` in logs

## Current Configuration

- Cluster: `n3rve-db.ie22loh.mongodb.net`
- Database: `pet-to-you`
- Username: `wonseok9706_db_user`
- Whitelisted IP: `121.162.140.75`

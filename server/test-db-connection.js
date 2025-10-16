#!/usr/bin/env node

/**
 * Test MongoDB Connection
 * Run: node server/test-db-connection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB Connection...\n');

// Check if MONGO_URI exists
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  console.error('💡 Make sure server/.env file exists with MONGO_URI');
  process.exit(1);
}

console.log('✅ MONGO_URI found');
console.log(`📍 Connecting to: ${process.env.MONGO_URI.split('@')[1]?.split('?')[0] || 'MongoDB'}\n`);

// Set options
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false);

const startTime = Date.now();

// Try to connect
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1,
  connectTimeoutMS: 30000,
})
.then(() => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ MongoDB Connected Successfully!`);
  console.log(`⏱️  Connection time: ${duration}s`);
  console.log(`🏠 Host: ${mongoose.connection.host}`);
  console.log(`📦 Database: ${mongoose.connection.name}`);
  console.log(`🔗 Ready State: ${mongoose.connection.readyState} (1 = connected)`);
  console.log('\n🎉 Database connection is working!\n');
  
  // Close connection
  mongoose.connection.close();
  process.exit(0);
})
.catch((err) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.error(`❌ MongoDB Connection Failed (after ${duration}s)\n`);
  console.error('Error:', err.message);
  console.error('\n🔧 Troubleshooting Tips:\n');
  
  if (err.message.includes('timed out')) {
    console.error('⚠️  Connection timed out. Possible causes:');
    console.error('   1. MongoDB Atlas cluster is paused (go to Atlas and resume it)');
    console.error('   2. Your IP is not whitelisted (add 0.0.0.0/0 in Network Access)');
    console.error('   3. Firewall blocking port 27017');
    console.error('   4. Network issues (check internet connection)');
  }
  
  if (err.message.includes('authentication')) {
    console.error('⚠️  Authentication failed. Possible causes:');
    console.error('   1. Wrong password in MONGO_URI');
    console.error('   2. User doesn\'t have access to database');
    console.error('   3. Password contains special characters (needs URL encoding)');
  }
  
  if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
    console.error('⚠️  DNS lookup failed. Possible causes:');
    console.error('   1. Wrong cluster URL in MONGO_URI');
    console.error('   2. DNS resolution issues');
    console.error('   3. Network/internet connection problems');
  }
  
  console.error('\n📚 See DATABASE_FIX.md for detailed troubleshooting\n');
  process.exit(1);
});

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Disconnected from MongoDB');
});

// Timeout warning
setTimeout(() => {
  if (mongoose.connection.readyState !== 1) {
    console.log('⏳ Still connecting... (this might take up to 30 seconds)');
  }
}, 5000);

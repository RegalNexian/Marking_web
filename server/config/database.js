const mongoose = require('mongoose');

let isConnected = false; // track connection globally
let connectionPromise = null; // track pending connection

const connectDB = async () => {
  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('Using existing MongoDB connection');
    return;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    console.log('Waiting for pending MongoDB connection...');
    await connectionPromise;
    return;
  }

  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('Missing MONGO_URI environment variable');
    }

    console.log('Connecting to MongoDB...');

    // Set mongoose options for better serverless performance
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', false); // Disable buffering
    
    // Store the connection promise with optimized settings
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000, // Increased to 30s for initial connection
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 30000,
    });

    const conn = await connectionPromise;
    isConnected = true;
    connectionPromise = null;
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection errors
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    isConnected = false;
    connectionPromise = null;
    
    // Provide helpful error message
    if (error.message.includes('timed out')) {
      console.error('💡 Tip: Check if MongoDB Atlas IP whitelist includes your current IP');
      console.error('💡 Tip: Verify MongoDB URI is correct');
      console.error('💡 Tip: Check if MongoDB cluster is running');
    }
    
    throw error; // re-throw to fail serverless function if DB is down
  }
};

module.exports = connectDB;

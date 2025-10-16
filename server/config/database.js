const mongoose = require('mongoose');

let isConnected = false; // track connection globally
let connectionPromise = null; // track pending connection

const connectDB = async () => {
  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('Missing MONGO_URI environment variable');
    }

    // Set mongoose options for better serverless performance
    mongoose.set('strictQuery', false);
    
    // Store the connection promise
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });

    const conn = await connectionPromise;
    isConnected = true;
    connectionPromise = null;
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection errors
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

  } catch (error) {
    console.error('Database connection error:', error);
    isConnected = false;
    connectionPromise = null;
    throw error; // re-throw to fail serverless function if DB is down
  }
};

module.exports = connectDB;

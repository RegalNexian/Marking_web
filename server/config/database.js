const mongoose = require('mongoose');

let isConnected = false; // track connection globally

const connectDB = async () => {
  if (isConnected) return; // reuse existing connection

  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error('Missing MONGO_URI environment variable');
    }

    const conn = await mongoose.connect(uri);
    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    throw error; // re-throw to fail serverless function if DB is down
  }
};

module.exports = connectDB;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');
const apiRoutes = require('./routes');
const configRoutes = require('./routes/configRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();

// Database Connection Middleware - Ensure DB is connected before processing requests
const ensureDBConnection = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    
    // Return user-friendly error
    return res.status(503).json({ 
      message: 'Database connection unavailable. Please try again in a moment.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      tip: 'If this persists, check MongoDB Atlas connection or contact administrator'
    });
  }
};

// ✅ CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://marking-web.vercel.app',
  'https://server-ashen-rho-94.vercel.app'
]

app.use(cors({
  origin: function(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost:')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no DB required)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Apply DB connection middleware to all API routes
app.use('/api', ensureDBConnection, apiRoutes);
app.use('/api/config', ensureDBConnection, configRoutes);
app.use('/api/export', ensureDBConnection, exportRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');

  app.use(express.static(clientDistPath));

  app.get(/^\/(?!api).*/, (req, res) => {
    const indexFilePath = path.join(clientDistPath, 'index.html');

    if (!fs.existsSync(indexFilePath)) {
      return res.json({
        message: 'College Competition API running',
        frontend: 'build not bundled in this deployment'
      });
    }

    res.sendFile(indexFilePath);
  });
} else {
  // Root route (dev only)
  app.get('/', (req, res) => {
    res.json({
      message: '🏫 College Competition Marking & Leaderboard System API',
      version: '1.0.0',
      status: 'Running',
      developer: 'K Rabindra Nath Senapaty'
    });
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation Error', 
      errors: err.errors 
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      message: 'Invalid ID format' 
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({ 
      message: 'Duplicate entry - this record already exists' 
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ 
    message: err.message || 'Something went wrong!',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler - MUST be after all other routes
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app; // Export app for serverless deployment

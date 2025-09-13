const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

console.log('Loading environment variables...');
require('dotenv').config({ path: './config.env' });
console.log('Environment variables loaded');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

console.log('Importing route files...');
// Import routes
const authRoutes = require('./routes/auth');
console.log('✅ Auth routes imported');
const blogRoutes = require('./routes/blog');
console.log('✅ Blog routes imported');
const userRoutes = require('./routes/user');
console.log('✅ User routes imported');

console.log('Creating Express app...');
const app = express();
console.log('Express app created');

console.log('Setting up security middleware...');
// Security middleware
app.use(helmet({
  // Allow images and other assets to be embedded cross-origin
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Disable COEP to avoid blocking cross-origin resources unintentionally
  crossOriginEmbedderPolicy: false
}));
console.log('✅ Helmet middleware added');
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://test1.we3vision.com"] 
    : ['http://localhost:3000'],
  credentials: true
}));
console.log('✅ CORS middleware added');
console.log('Setting up body parsing middleware...');
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
console.log('✅ JSON body parser added');
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('✅ URL-encoded body parser added');

console.log('Setting up rate limiting...');
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
console.log('✅ Rate limiting middleware added');

console.log('Setting up request logging middleware...');
// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  next();
});
console.log('✅ Request logging middleware added');



console.log('Setting up static files and other routes...');
// Static files with permissive CORP header for cross-origin usage
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));
console.log('✅ Static files middleware added');

// Routes
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes mounted at /api/auth');
app.use('/api/blog', blogRoutes);
console.log('✅ Blog routes mounted at /api/blog');
app.use('/api/user', userRoutes);
console.log('✅ User routes mounted at /api/user');

// Job routes
const jobRoutes = require('./routes/job');
app.use('/api/job', jobRoutes);
console.log('✅ Job routes mounted at /api/job');

console.log('Setting up health check and error handling...');
// Health check
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({ 
    status: 'success', 
    message: 'We3Vision API is running',
    timestamp: new Date().toISOString()
  });
});
console.log('✅ Health check endpoint added');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error handling middleware caught error:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ 
    status: 'error', 
    message: 'Something went wrong!' 
  });
});
console.log('✅ Error handling middleware added');

// 404 handler
app.use('*', (req, res) => {
  console.log('404 handler - route not found:', req.method, req.path);
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found' 
  });
});
console.log('✅ 404 handler added');

console.log('Setting up MongoDB connection...');
// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
console.log('MongoDB URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('MongoDB connection ready');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Add connection event listeners
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error event:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected event fired');
});

mongoose.connection.on('open', () => {
  console.log('✅ MongoDB connection opened');
});

const PORT = process.env.PORT || 5000;
console.log('Port configured:', PORT);

console.log('Starting server...');
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('Server startup complete!');
  console.log('Ready to handle requests!');
}).on('error', (err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
}); 



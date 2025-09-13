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
const authRoutes = require('./routes/auth');
console.log('✅ Auth routes imported');
const blogRoutes = require('./routes/blog');
console.log('✅ Blog routes imported');
const userRoutes = require('./routes/user');
console.log('✅ User routes imported');
const jobRoutes = require('./routes/job');
console.log('✅ Job routes imported');

console.log('Creating Express app...');
const app = express();
console.log('Express app created');

// ----------------- SECURITY + CORS -----------------
console.log('Setting up CORS and security middleware...');

const allowedOrigins = [
  "http://localhost:3000",
  "https://test1.we3vision.com"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ Not allowed by CORS: " + origin));
    }
  },
  credentials: true
}));

// Handle preflight requests
app.options("*", cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));
console.log('✅ Helmet + CORS middleware added');

// ----------------- BODY PARSING -----------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log('✅ Body parsing middleware added');

// ----------------- RATE LIMITING -----------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
console.log('✅ Rate limiting middleware added');

// ----------------- REQUEST LOGGING -----------------
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  next();
});
console.log('✅ Request logging middleware added');

// ----------------- STATIC FILES -----------------
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));
console.log('✅ Static files middleware added');

// ----------------- ROUTES -----------------
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes mounted at /api/auth');
app.use('/api/blog', blogRoutes);
console.log('✅ Blog routes mounted at /api/blog');
app.use('/api/user', userRoutes);
console.log('✅ User routes mounted at /api/user');
app.use('/api/job', jobRoutes);
console.log('✅ Job routes mounted at /api/job');

// ----------------- HEALTH CHECK -----------------
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({
    status: 'success',
    message: 'We3Vision API is running',
    timestamp: new Date().toISOString()
  });
});
console.log('✅ Health check endpoint added');

// ----------------- ERROR HANDLING -----------------
app.use((err, req, res, next) => {
  console.error('❌ Error handling middleware caught error:', err);
  console.error('Error stack:', err.stack);
  if (err.message.includes("CORS")) {
    return res.status(403).json({ status: 'error', message: err.message });
  }
  res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});
console.log('✅ Error handling middleware added');

// ----------------- 404 HANDLER -----------------
app.use('*', (req, res) => {
  console.log('404 handler - route not found:', req.method, req.path);
  res.status(404).json({ status: 'error', message: 'Route not found' });
});
console.log('✅ 404 handler added');

// ----------------- DATABASE -----------------
console.log('Setting up MongoDB connection...');
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

mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err));
mongoose.connection.on('disconnected', () => console.log('⚠️ MongoDB disconnected'));
mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
mongoose.connection.on('open', () => console.log('✅ MongoDB connection opened'));

// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('✅ Server startup complete, ready to handle requests!');
}).on('error', (err) => {
  console.error('❌ Server startup error:', err);
  process.exit(1);
});

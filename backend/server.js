const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// --- Route imports ---
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentExportRoutes = require('./routes/paymentExport');
const paymentRoutes = require('./routes/payments');
const backupRoutes = require('./routes/backupRoutes');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// --- Global Middleware ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

// ⚠️ IMPORTANT: Mount paymentExportRoutes BEFORE paymentRoutes
// to prevent /:id or /:sheetId from capturing /export-data/:academicYear
app.use('/api/payments', paymentExportRoutes);
app.use('/api/payments', paymentRoutes);

app.use('/api/backup', backupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Attendance & Payment System API is running',
    timestamp: new Date(),
  });
});

// --- ERROR & 404 HANDLERS (Must be at the very bottom) ---

// 404 handler (Catch-all for unmatched routes)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
});
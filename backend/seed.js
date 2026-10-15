// 1. Force Google DNS at the very top
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const path = require('path');
// 2. Load .env properly even if inside a subfolder
require('dotenv').config({ path: path.join(__dirname, '.env') });
// fallback if .env is in the root directory and this script is inside a folder:
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const mongoose = require('mongoose');
const User = require('./models/User'); // adjust path if this script is inside a subfolder (e.g., '../models/User')

const seedAdmin = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined. Check your .env file path!');
    }

    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteMany({});
    console.log('🧹 Cleared old users');

    await User.create({
      name: 'Admin',
      email: 'admin@attendance.com',
      password: 'admin123', // Model will hash it automatically
      role: 'admin',
    });

    console.log('🎉 Admin created!');
    console.log('📧 Email:    admin@attendance.com');
    console.log('🔑 Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
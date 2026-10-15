require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const test = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to DB\n');

  // List ALL users in the database
  const users = await User.find({}).select('+password');
  console.log(`📋 Users in database: ${users.length}`);
  users.forEach((u) => console.log(`   → ${u.email} (role: ${u.role})`));

  // Try to find the admin
  const user = await User.findOne({ email: 'admin@attendance.com' }).select('+password');
  if (!user) {
    console.log('\n❌ User "admin@attendance.com" NOT found in database!');
    console.log('   → That is why login returns 401.');
  } else {
    const match = await bcrypt.compare('admin123', user.password);
    console.log(`\n🔑 Password "admin123" matches: ${match ? '✅ YES' : '❌ NO — password is wrong/hashed incorrectly'}`);
  }
  process.exit(0);
};

test();
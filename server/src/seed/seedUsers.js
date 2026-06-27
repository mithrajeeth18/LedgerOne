require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { connectDB } = require('../config/db');

const COLLECTORS = [
  { name: 'Collector 1', email: 'collector1@gmail.com', password: 'changeme123' },
  { name: 'Collector 2', email: 'collector2@gmail.com', password: 'changeme456' },
];

const seed = async () => {
  await connectDB();

  for (const c of COLLECTORS) {
    const existing = await User.findOne({ email: c.email });
    if (existing) {
      console.log(`User already exists: ${c.email} - skipping`);
      continue;
    }

    const passwordHash = await bcrypt.hash(c.password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);
    await User.create({ name: c.name, email: c.email, passwordHash });
    console.log(`Created: ${c.name} (${c.email})`);
  }

  await mongoose.disconnect();
  console.log('Seed complete');
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

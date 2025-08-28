// scripts/sync-indexes.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Put it in .env or set env var.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const Link = require('../models/Link');

  console.log('Connected. Syncing indexes for Link...');
  const res = await Link.syncIndexes();
  console.log('syncIndexes result:', res);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

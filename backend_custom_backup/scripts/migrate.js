require('dotenv').config();
const { sequelize, testConnection } = require('../config/database');

async function migrate() {
  console.log('🔄 Starting migration...');
  
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  // Force sync to create tables
  await sequelize.sync({ force: true });
  console.log('✅ Tables created!');
  
  process.exit(0);
}

migrate();

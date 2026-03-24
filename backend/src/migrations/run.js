require('dotenv').config();
const { sequelize } = require('../models');

async function runMigration() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Migration complete. Database schema is up to date.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

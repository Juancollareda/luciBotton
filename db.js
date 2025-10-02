const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(1);
});

// Export a function that ensures the database connection works
async function getPool() {
  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    client.release();
    return pool;
  } catch (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
}

module.exports = { pool, getPool };

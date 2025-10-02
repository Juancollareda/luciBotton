const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require',
    require: true
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
});

// Log pool events for debugging
pool.on('connect', () => {
  console.log('Database pool connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed. Attempting to reconnect...');
  }
});

// Export a function that ensures the database connection works
async function getPool() {
  try {
    const client = await pool.connect();
    console.log('Database connection test successful');
    client.release();
    return pool;
  } catch (err) {
    console.error('Error connecting to the database:', err);
    console.error('Connection details:', {
      host: new URL(process.env.DATABASE_URL).hostname,
      database: new URL(process.env.DATABASE_URL).pathname.slice(1),
      ssl: true
    });
    process.exit(1);
  }
}

module.exports = { pool, getPool };

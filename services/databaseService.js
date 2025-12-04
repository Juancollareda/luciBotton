/**
 * Database Service Layer
 * Contains all database operations and query functions
 */

const { pool } = require('../db');

// ==================== TABLE INITIALIZATION ====================

async function initializeTables() {
  try {
    console.log('Initializing database tables...');

    // Counter table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS counter (
        id SERIAL PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);

    const counterResult = await pool.query('SELECT * FROM counter');
    if (counterResult.rows.length === 0) {
      await pool.query('INSERT INTO counter (count) VALUES (0)');
      console.log('Created initial counter');
    }

    // Country clicks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_clicks (
        id SERIAL PRIMARY KEY,
        country_code TEXT NOT NULL UNIQUE,
        clicks INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Country missiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_missiles (
        id SERIAL PRIMARY KEY,
        country_code TEXT NOT NULL UNIQUE,
        last_missile TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Country challenges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_challenges (
        id SERIAL PRIMARY KEY,
        challenger_country TEXT NOT NULL,
        challenged_country TEXT NOT NULL,
        bet_amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        winner_country TEXT,
        FOREIGN KEY (challenger_country) REFERENCES country_clicks(country_code),
        FOREIGN KEY (challenged_country) REFERENCES country_clicks(country_code)
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
}

// ==================== COUNTRY OPERATIONS ====================

async function getCountryClicks(countryCode) {
  try {
    const result = await pool.query(
      'SELECT * FROM country_clicks WHERE country_code = $1',
      [countryCode]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error(`Error getting clicks for ${countryCode}:`, error);
    throw error;
  }
}

async function updateCountryClicks(countryCode, increment = 1) {
  try {
    // Ensure country exists
    await pool.query(
      `INSERT INTO country_clicks (country_code, clicks)
       VALUES ($1, $2)
       ON CONFLICT (country_code) DO NOTHING;`,
      [countryCode, 0]
    );

    // Update clicks
    const result = await pool.query(
      `UPDATE country_clicks 
       SET clicks = clicks + $1
       WHERE country_code = $2
       RETURNING *;`,
      [increment, countryCode]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`Error updating clicks for ${countryCode}:`, error);
    throw error;
  }
}

async function getAllCountryClicks() {
  try {
    const result = await pool.query(
      'SELECT country_code, clicks FROM country_clicks ORDER BY clicks DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting all country clicks:', error);
    throw error;
  }
}

// ==================== GLOBAL COUNTER OPERATIONS ====================

async function getGlobalCount() {
  try {
    const result = await pool.query('SELECT count FROM counter WHERE id = 1');
    return result.rows[0]?.count || 0;
  } catch (error) {
    console.error('Error getting global count:', error);
    throw error;
  }
}

async function updateGlobalCount(increment = 1) {
  try {
    const result = await pool.query(
      'UPDATE counter SET count = count + $1 WHERE id = 1 RETURNING count',
      [increment]
    );
    return result.rows[0]?.count || 0;
  } catch (error) {
    console.error('Error updating global count:', error);
    throw error;
  }
}

async function syncGlobalCountToCountrySum() {
  try {
    const result = await pool.query('SELECT SUM(clicks) AS total FROM country_clicks');
    const total = result.rows[0]?.total || 0;
    await pool.query('UPDATE counter SET count = $1 WHERE id = 1', [total]);
    return total;
  } catch (error) {
    console.error('Error syncing global count:', error);
    throw error;
  }
}

// ==================== MISSILE OPERATIONS ====================

async function getLastMissileTime(countryCode) {
  try {
    const result = await pool.query(
      'SELECT last_missile FROM country_missiles WHERE country_code = $1',
      [countryCode]
    );
    return result.rows[0]?.last_missile || null;
  } catch (error) {
    console.error(`Error getting missile time for ${countryCode}:`, error);
    throw error;
  }
}

async function updateLastMissileTime(countryCode) {
  try {
    await pool.query(
      `INSERT INTO country_missiles (country_code, last_missile)
       VALUES ($1, CURRENT_TIMESTAMP)
       ON CONFLICT (country_code)
       DO UPDATE SET last_missile = CURRENT_TIMESTAMP;`,
      [countryCode]
    );
  } catch (error) {
    console.error(`Error updating missile time for ${countryCode}:`, error);
    throw error;
  }
}

async function canLaunchMissile(countryCode, cooldownMs) {
  try {
    const lastMissile = await getLastMissileTime(countryCode);
    if (!lastMissile) return true;

    const timeSinceLastMissile = Date.now() - new Date(lastMissile).getTime();
    return timeSinceLastMissile >= cooldownMs;
  } catch (error) {
    console.error(`Error checking missile availability for ${countryCode}:`, error);
    throw error;
  }
}

// ==================== CHALLENGE OPERATIONS ====================

async function createChallenge(challengerCountry, challengedCountry, betAmount) {
  try {
    const result = await pool.query(
      `INSERT INTO country_challenges 
       (challenger_country, challenged_country, bet_amount)
       VALUES ($1, $2, $3)
       RETURNING id;`,
      [challengerCountry, challengedCountry, betAmount]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
}

async function getChallenge(challengeId) {
  try {
    const result = await pool.query(
      'SELECT * FROM country_challenges WHERE id = $1',
      [challengeId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error(`Error getting challenge ${challengeId}:`, error);
    throw error;
  }
}

async function getChallengesForCountry(countryCode) {
  try {
    const result = await pool.query(
      `SELECT * FROM country_challenges 
       WHERE (challenger_country = $1 OR challenged_country = $1)
       AND status IN ('pending', 'active')
       ORDER BY created_at DESC;`,
      [countryCode]
    );
    return result.rows;
  } catch (error) {
    console.error(`Error getting challenges for ${countryCode}:`, error);
    throw error;
  }
}

async function updateChallengeStatus(challengeId, status) {
  try {
    const result = await pool.query(
      `UPDATE country_challenges 
       SET status = $1
       WHERE id = $2
       RETURNING *;`,
      [status, challengeId]
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error updating challenge ${challengeId} status:`, error);
    throw error;
  }
}

async function completeChallenge(challengeId, winnerCountry, betAmount) {
  try {
    // Award winner with both bets
    const totalPrize = betAmount * 2;
    await pool.query(
      `UPDATE country_clicks 
       SET clicks = clicks + $1
       WHERE country_code = $2;`,
      [totalPrize, winnerCountry]
    );

    // Update challenge status
    const result = await pool.query(
      `UPDATE country_challenges 
       SET status = 'completed', winner_country = $1
       WHERE id = $2
       RETURNING *;`,
      [winnerCountry, challengeId]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`Error completing challenge ${challengeId}:`, error);
    throw error;
  }
}

module.exports = {
  initializeTables,
  getCountryClicks,
  updateCountryClicks,
  getAllCountryClicks,
  getGlobalCount,
  updateGlobalCount,
  syncGlobalCountToCountrySum,
  getLastMissileTime,
  updateLastMissileTime,
  canLaunchMissile,
  createChallenge,
  getChallenge,
  getChallengesForCountry,
  updateChallengeStatus,
  completeChallenge,
  pool, // Export pool for direct queries when needed
};

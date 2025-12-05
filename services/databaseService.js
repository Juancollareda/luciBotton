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

    // Country stats table (for achievements, win rates, etc)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_stats (
        id SERIAL PRIMARY KEY,
        country_code TEXT NOT NULL UNIQUE,
        challenges_won INTEGER DEFAULT 0,
        challenges_lost INTEGER DEFAULT 0,
        total_missiles_launched INTEGER DEFAULT 0,
        total_damage_taken INTEGER DEFAULT 0,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (country_code) REFERENCES country_clicks(country_code)
      );
    `);

    // Seasonal rankings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seasonal_rankings (
        id SERIAL PRIMARY KEY,
        season_name TEXT NOT NULL,
        country_code TEXT NOT NULL,
        clicks INTEGER NOT NULL,
        rank INTEGER,
        season_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        season_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Country shields (for missile defense)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS country_shields (
        id SERIAL PRIMARY KEY,
        country_code TEXT NOT NULL UNIQUE,
        shield_active BOOLEAN DEFAULT FALSE,
        shield_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (country_code) REFERENCES country_clicks(country_code)
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

    // Update stats
    const challenge = result.rows[0];
    const loserCountry = challenge.challenger_country === winnerCountry 
      ? challenge.challenged_country 
      : challenge.challenger_country;

    await updateCountryStats(winnerCountry, { challenges_won: 1 });
    await updateCountryStats(loserCountry, { challenges_lost: 1 });

    return result.rows[0];
  } catch (error) {
    console.error(`Error completing challenge ${challengeId}:`, error);
    throw error;
  }
}

// ==================== COUNTRY STATS OPERATIONS ====================

async function getCountryStats(countryCode) {
  try {
    const result = await pool.query(
      'SELECT * FROM country_stats WHERE country_code = $1',
      [countryCode]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error(`Error getting stats for ${countryCode}:`, error);
    throw error;
  }
}

async function updateCountryStats(countryCode, updates) {
  try {
    // Ensure country stats exist
    await pool.query(
      `INSERT INTO country_stats (country_code)
       VALUES ($1)
       ON CONFLICT (country_code) DO NOTHING;`,
      [countryCode]
    );

    // Build update query dynamically
    const validFields = ['challenges_won', 'challenges_lost', 'total_missiles_launched', 'total_damage_taken'];
    const updateParts = [];
    const params = [countryCode];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (validFields.includes(key)) {
        paramCount++;
        updateParts.push(`${key} = ${key} + $${paramCount}`);
        params.push(value);
      }
    }

    if (updateParts.length === 0) {
      return await getCountryStats(countryCode);
    }

    updateParts.push(`last_activity = CURRENT_TIMESTAMP`);

    const result = await pool.query(
      `UPDATE country_stats 
       SET ${updateParts.join(', ')}
       WHERE country_code = $1
       RETURNING *;`,
      params
    );

    return result.rows[0];
  } catch (error) {
    console.error(`Error updating stats for ${countryCode}:`, error);
    throw error;
  }
}

// ==================== TIER/RANK OPERATIONS ====================

function getCountryTier(clicks) {
  if (clicks < 1000) return { name: 'Bronze', color: '#CD7F32', icon: '🥉' };
  if (clicks < 10000) return { name: 'Silver', color: '#C0C0C0', icon: '🥈' };
  if (clicks < 100000) return { name: 'Gold', color: '#FFD700', icon: '🥇' };
  return { name: 'Legendary', color: '#FF1493', icon: '💎' };
}

async function getRankingWithTiers() {
  try {
    const countries = await getAllCountryClicks();
    return countries.map((country, index) => ({
      ...country,
      rank: index + 1,
      tier: getCountryTier(country.clicks)
    }));
  } catch (error) {
    console.error('Error getting ranking with tiers:', error);
    throw error;
  }
}

// ==================== SHIELD OPERATIONS ====================

async function grantShield(countryCode, durationMinutes = 120) {
  try {
    const expiresAt = new Date(Date.now() + durationMinutes * 60000);
    // First try to update
    const updateResult = await pool.query(
      `UPDATE country_shields 
       SET shield_active = true, shield_expires = $1 
       WHERE country_code = $2
       RETURNING *;`,
      [expiresAt, countryCode]
    );
    
    // If no rows were updated, insert
    if (updateResult.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO country_shields (country_code, shield_active, shield_expires)
         VALUES ($1, true, $2)
         RETURNING *;`,
        [countryCode, expiresAt]
      );
      return insertResult.rows[0];
    }
    
    return updateResult.rows[0];
  } catch (error) {
    console.error(`Error granting shield to ${countryCode}:`, error);
    throw error;
  }
}

async function isShielded(countryCode) {
  try {
    const result = await pool.query(
      `SELECT * FROM country_shields 
       WHERE country_code = $1 
       AND shield_active = true 
       AND shield_expires > CURRENT_TIMESTAMP`,
      [countryCode]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking shield for ${countryCode}:`, error);
    throw error;
  }
}

async function removeExpiredShields() {
  try {
    const result = await pool.query(
      `UPDATE country_shields 
       SET shield_active = false 
       WHERE shield_expires <= CURRENT_TIMESTAMP AND shield_active = true;`
    );
    if (result.rowCount > 0) {
      console.log(`Removed ${result.rowCount} expired shields`);
    }
  } catch (error) {
    if (error.code === '42P01') {
      // Table doesn't exist yet, that's fine
      return;
    }
    console.error('Error removing expired shields:', error);
    throw error;
  }
}

async function getShieldTimeRemaining(countryCode) {
  try {
    const result = await pool.query(
      `SELECT shield_expires as expires_at FROM country_shields 
       WHERE country_code = $1 
       AND shield_active = true 
       AND shield_expires > CURRENT_TIMESTAMP`,
      [countryCode]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(`Error getting shield time for ${countryCode}:`, error);
    return null;
  }
}

// ==================== SEASONAL RESET FUNCTIONS ====================

async function archiveSeasonStats() {
  try {
    const seasonName = `Season-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    
    // Insert current stats into seasonal rankings before reset
    await pool.query(`
      INSERT INTO seasonal_rankings (season_name, country_code, clicks, challenges_won, challenges_lost, total_missiles_launched)
      SELECT $1, cc.country_code, cc.clicks, 
             COALESCE(cs.challenges_won, 0),
             COALESCE(cs.challenges_lost, 0),
             COALESCE(cs.total_missiles_launched, 0)
      FROM country_clicks cc
      LEFT JOIN country_stats cs ON cc.country_code = cs.country_code
      ON CONFLICT (season_name, country_code) DO UPDATE SET
        clicks = EXCLUDED.clicks,
        challenges_won = EXCLUDED.challenges_won,
        challenges_lost = EXCLUDED.challenges_lost,
        total_missiles_launched = EXCLUDED.total_missiles_launched
    `, [seasonName]);
    console.log('Season stats archived successfully');
  } catch (error) {
    console.error('Error archiving season stats:', error);
    throw error;
  }
}

async function resetWeeklyChallenges() {
  try {
    // Archive old challenges
    await pool.query(`
      UPDATE country_challenges 
      SET status = 'archived' 
      WHERE created_at < NOW() - INTERVAL '7 days' AND status != 'archived'
    `);
    console.log('Weekly challenges reset successfully');
  } catch (error) {
    console.error('Error resetting weekly challenges:', error);
    throw error;
  }
}

async function resetDailyMissiles() {
  try {
    // Reset missile cooldowns for new day
    await pool.query(`
      UPDATE country_missiles 
      SET last_missile = NULL 
      WHERE last_missile < NOW() - INTERVAL '24 hours'
    `);
    console.log('Daily missile cooldowns reset successfully');
  } catch (error) {
    console.error('Error resetting missile cooldowns:', error);
    throw error;
  }
}

async function getSeasonalLeaderboard(seasonName) {
  try {
    const result = await pool.query(`
      SELECT country_code, clicks, challenges_won, challenges_lost, total_missiles_launched
      FROM seasonal_rankings
      WHERE season_name = $1
      ORDER BY clicks DESC
    `, [seasonName]);
    return result.rows;
  } catch (error) {
    console.error(`Error getting seasonal leaderboard for ${seasonName}:`, error);
    throw error;
  }
}

async function getCurrentSeason() {
  try {
    const result = await pool.query(`
      SELECT DISTINCT season_name 
      FROM seasonal_rankings 
      ORDER BY season_name DESC 
      LIMIT 1
    `);
    return result.rows[0]?.season_name || 'Season-Rookie';
  } catch (error) {
    console.error('Error getting current season:', error);
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
  // Stats and Tiers
  getCountryStats,
  updateCountryStats,
  getCountryTier,
  getRankingWithTiers,
  // Shields
  grantShield,
  isShielded,
  removeExpiredShields,
  getShieldTimeRemaining,
  // Seasonal Resets
  archiveSeasonStats,
  resetWeeklyChallenges,
  resetDailyMissiles,
  getSeasonalLeaderboard,
  getCurrentSeason,
  // Database pool
  pool, // Export pool for direct queries when needed
};

/**
 * Enhanced Game Routes
 * Handles all new game features: tiers, stats, shields, improved missiles
 */

const express = require('express');
const databaseService = require('../services/databaseService');
const getIP = require('../utils/getIP');
const geoip = require('geoip-lite');

const router = express.Router();

// ==================== TIER/RANKING ROUTES ====================

/**
 * Get ranking with tier badges
 * GET /api/ranking/tiers
 */
router.get('/ranking/tiers', async (req, res) => {
  try {
    const ranking = await databaseService.getRankingWithTiers();
    res.json(ranking);
  } catch (error) {
    console.error('Error getting ranking with tiers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get country info with stats and tier
 * GET /api/country/:code
 */
router.get('/country/:code', async (req, res) => {
  try {
    const countryCode = req.params.code.toUpperCase();
    const clicks = await databaseService.getCountryClicks(countryCode);
    const stats = await databaseService.getCountryStats(countryCode);
    const tier = databaseService.getCountryTier(clicks?.clicks || 0);
    const isShielded = await databaseService.isShielded(countryCode);

    if (!clicks) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json({
      country: countryCode,
      clicks: clicks.clicks,
      tier: tier,
      stats: stats || {
        challenges_won: 0,
        challenges_lost: 0,
        total_missiles_launched: 0,
        total_damage_taken: 0,
        last_activity: clicks.created_at
      },
      isShielded: isShielded,
      created_at: clicks.created_at
    });
  } catch (error) {
    console.error('Error getting country info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== STATS ROUTES ====================

/**
 * Get own country stats
 * GET /api/stats/my-country
 */
router.get('/stats/my-country', async (req, res) => {
  try {
    const ip = getIP(req);
    const geo = geoip.lookup(ip);
    const countryCode = geo ? geo.country : 'XX';

    const clicks = await databaseService.getCountryClicks(countryCode);
    const stats = await databaseService.getCountryStats(countryCode);
    const tier = databaseService.getCountryTier(clicks?.clicks || 0);

    res.json({
      country: countryCode,
      clicks: clicks?.clicks || 0,
      tier: tier,
      stats: stats || {
        challenges_won: 0,
        challenges_lost: 0,
        total_missiles_launched: 0,
        total_damage_taken: 0,
        last_activity: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting own country stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== IMPROVED MISSILE ROUTES ====================

const MISSILE_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const MISSILE_COST = 50; // Cost in clicks to launch
const MAX_DAMAGE_PERCENT = 0.5; // Max 50% of target's clicks

/**
 * Launch missile with cost and damage cap
 * POST /api/missile/launch?target=XX&amount=50
 */
router.post('/missile/launch', async (req, res) => {
  try {
    const ip = getIP(req);
    const geo = geoip.lookup(ip);
    const attackerCountry = geo ? geo.country : 'XX';
    const targetCountry = req.query.target ? req.query.target.toUpperCase() : null;
    const requestedDamage = Math.max(MISSILE_COST, parseInt(req.query.amount) || MISSILE_COST);

    // Validation
    if (!targetCountry) return res.status(400).json({ error: 'Missing target country' });
    if (attackerCountry === targetCountry) return res.status(400).json({ error: 'Cannot attack yourself' });

    // Check attacker has enough clicks for missile cost
    const attacker = await databaseService.getCountryClicks(attackerCountry);
    if (!attacker || attacker.clicks < MISSILE_COST) {
      return res.status(400).json({ error: `Need at least ${MISSILE_COST} clicks to launch missile` });
    }

    // Check cooldown
    const canLaunch = await databaseService.canLaunchMissile(attackerCountry, MISSILE_COOLDOWN_MS);
    if (!canLaunch) {
      const lastMissile = await databaseService.getLastMissileTime(attackerCountry);
      const remainingMs = MISSILE_COOLDOWN_MS - (Date.now() - new Date(lastMissile).getTime());
      return res.status(403).json({ 
        error: 'Missile on cooldown',
        remainingMs: remainingMs
      });
    }

    // Check if target is shielded
    const isShielded = await databaseService.isShielded(targetCountry);
    if (isShielded) {
      return res.status(403).json({ error: 'Target has a shield! Try again later.' });
    }

    // Get target info
    const target = await databaseService.getCountryClicks(targetCountry);
    if (!target) return res.status(404).json({ error: `No clicks recorded for ${targetCountry}` });

    // Calculate actual damage (capped at 50% of target's clicks)
    const maxDamage = Math.floor(target.clicks * MAX_DAMAGE_PERCENT);
    const actualDamage = Math.min(requestedDamage, maxDamage);

    // Apply damage
    const newTargetClicks = Math.max(0, target.clicks - actualDamage);
    await databaseService.pool.query(
      'UPDATE country_clicks SET clicks = $1 WHERE country_code = $2',
      [newTargetClicks, targetCountry]
    );

    // Deduct missile cost from attacker
    await databaseService.updateCountryClicks(attackerCountry, -MISSILE_COST);

    // Update missile cooldown
    await databaseService.updateLastMissileTime(attackerCountry);

    // Update stats
    await databaseService.updateCountryStats(attackerCountry, { 
      total_missiles_launched: 1 
    });
    await databaseService.updateCountryStats(targetCountry, { 
      total_damage_taken: actualDamage 
    });

    // Grant shield to target (2 hour cooldown before next missile hit)
    await databaseService.grantShield(targetCountry, 120);

    // Broadcast updates
    if (global.broadcast) {
      global.broadcast('missileAttack', {
        attacker: attackerCountry,
        target: targetCountry,
        damage: actualDamage,
        targetNewClicks: newTargetClicks,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: `Missile launched! ${actualDamage} clicks removed from ${targetCountry}`,
      damage: actualDamage,
      cost: MISSILE_COST,
      targetNewClicks: newTargetClicks,
      shieldGranted: true,
      shieldDuration: 120
    });
  } catch (error) {
    console.error('Error launching missile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get missile launch info for current country
 * GET /api/missile/info
 */
router.get('/missile/info', async (req, res) => {
  try {
    const ip = getIP(req);
    const geo = geoip.lookup(ip);
    const countryCode = geo ? geo.country : 'XX';

    const clicks = await databaseService.getCountryClicks(countryCode);
    const lastMissile = await databaseService.getLastMissileTime(countryCode);
    const canLaunch = await databaseService.canLaunchMissile(countryCode, MISSILE_COOLDOWN_MS);
    const isShielded = await databaseService.isShielded(countryCode);

    let cooldownInfo = null;
    if (!canLaunch && lastMissile) {
      const timeSinceLaunch = Date.now() - new Date(lastMissile).getTime();
      const remainingMs = MISSILE_COOLDOWN_MS - timeSinceLaunch;
      cooldownInfo = {
        remainingMs: remainingMs,
        remainingMinutes: Math.ceil(remainingMs / 60000)
      };
    }

    res.json({
      country: countryCode,
      canLaunch: canLaunch,
      cost: MISSILE_COST,
      maxDamagePercent: MAX_DAMAGE_PERCENT * 100,
      cooldown: cooldownInfo,
      currentClicks: clicks?.clicks || 0,
      isShielded: isShielded,
      cooldownMinutes: Math.round(MISSILE_COOLDOWN_MS / 60000)
    });
  } catch (error) {
    console.error('Error getting missile info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SHIELD ROUTES ====================

/**
 * Get shield status
 * GET /api/shield/status
 */
router.get('/shield/status', async (req, res) => {
  try {
    const ip = getIP(req);
    const geo = geoip.lookup(ip);
    const countryCode = geo ? geo.country : 'XX';

    const isShielded = await databaseService.isShielded(countryCode);

    res.json({
      country: countryCode,
      isShielded: isShielded,
      message: isShielded ? 'Your country is protected from missile attacks' : 'No active shield'
    });
  } catch (error) {
    console.error('Error getting shield status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== LEADERBOARD ROUTES ====================

/**
 * Get global leaderboard with tiers
 * GET /api/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    // Remove expired shields every time leaderboard is loaded
    await databaseService.removeExpiredShields();

    const ranking = await databaseService.getRankingWithTiers();
    const top10 = ranking.slice(0, 10);

    res.json({
      total: ranking.length,
      top10: top10,
      fullRanking: ranking
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== GOLDEN BUNBAT ROUTES ====================

/**
 * Broadcast golden bunbat spawn to all players
 * POST /api/golden/spawn
 */
router.post('/golden/spawn', async (req, res) => {
  try {
    const ip = getIP(req);
    const geo = geoip.lookup(ip);
    const countryCode = geo ? geo.country : 'XX';

    // Broadcast to all connected clients via WebSocket
    global.broadcast({
      type: 'goldenSpawn',
      country: countryCode,
      spawnedAt: new Date()
    });

    res.json({ success: true, message: 'Golden bunbat spawn broadcasted' });
  } catch (error) {
    console.error('Error broadcasting golden spawn:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SEASONAL LEADERBOARD ROUTES ====================

/**
 * Get current season name
 * GET /api/season/current
 */
router.get('/season/current', async (req, res) => {
  try {
    const season = await databaseService.getCurrentSeason();
    res.json({ season: season });
  } catch (error) {
    console.error('Error getting current season:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get seasonal leaderboard
 * GET /api/season/:name/leaderboard
 */
router.get('/season/:name/leaderboard', async (req, res) => {
  try {
    const seasonName = req.params.name;
    const leaderboard = await databaseService.getSeasonalLeaderboard(seasonName);
    
    // Add tier info to each entry
    const withTiers = leaderboard.map((entry, index) => ({
      rank: index + 1,
      country_code: entry.country_code,
      clicks: entry.clicks,
      tier: databaseService.getCountryTier(entry.clicks),
      challenges_won: entry.challenges_won,
      challenges_lost: entry.challenges_lost,
      total_missiles_launched: entry.total_missiles_launched
    }));

    res.json({
      season: seasonName,
      leaderboard: withTiers
    });
  } catch (error) {
    console.error('Error getting seasonal leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Trigger weekly reset (admin only - add auth in production)
 * POST /api/season/reset-weekly
 */
router.post('/season/reset-weekly', async (req, res) => {
  try {
    await databaseService.resetWeeklyChallenges();
    res.json({ success: true, message: 'Weekly challenges reset' });
  } catch (error) {
    console.error('Error resetting weekly challenges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Trigger daily reset (admin only - add auth in production)
 * POST /api/season/reset-daily
 */
router.post('/season/reset-daily', async (req, res) => {
  try {
    await databaseService.resetDailyMissiles();
    res.json({ success: true, message: 'Daily missile cooldowns reset' });
  } catch (error) {
    console.error('Error resetting daily missiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Archive season stats (triggered at season end)
 * POST /api/season/archive
 */
router.post('/season/archive', async (req, res) => {
  try {
    await databaseService.archiveSeasonStats();
    res.json({ success: true, message: 'Season stats archived' });
  } catch (error) {
    console.error('Error archiving season stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

/**
 * Reset Scheduler Service
 * Handles automated seasonal and daily resets
 */

const databaseService = require('./databaseService');

let schedulerRunning = false;

/**
 * Start the reset scheduler
 * - Every 24 hours: Reset daily missile cooldowns
 * - Every 7 days: Archive weekly challenges and stats
 */
function startResetScheduler() {
  if (schedulerRunning) {
    console.log('Reset scheduler already running');
    return;
  }

  schedulerRunning = true;
  console.log('🔄 Reset scheduler started');

  // Daily reset at midnight (00:00)
  scheduleDailyReset();

  // Weekly reset every Monday at 00:00
  scheduleWeeklyReset();

  // Cleanup expired shields every hour
  scheduleShieldCleanup();
}

function scheduleDailyReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilReset = tomorrow - now;

  setTimeout(async () => {
    console.log('⏰ Daily reset triggered at', new Date().toISOString());
    try {
      await databaseService.resetDailyMissiles();
      console.log('✓ Daily missile cooldowns reset');
    } catch (error) {
      console.error('❌ Error during daily reset:', error);
    }

    // Schedule next daily reset
    scheduleDailyReset();
  }, timeUntilReset);

  console.log(`📅 Next daily reset in ${Math.round(timeUntilReset / 60000)} minutes`);
}

function scheduleWeeklyReset() {
  const now = new Date();
  let nextMonday = new Date(now);
  
  // Calculate days until next Monday (day 1)
  const dayOfWeek = nextMonday.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
  
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const timeUntilReset = nextMonday - now;

  setTimeout(async () => {
    console.log('⏰ Weekly reset triggered at', new Date().toISOString());
    try {
      // Archive current season stats
      await databaseService.archiveSeasonStats();
      console.log('✓ Season stats archived');

      // Reset weekly challenges
      await databaseService.resetWeeklyChallenges();
      console.log('✓ Weekly challenges reset');

      // Broadcast to all clients
      if (global.broadcast) {
        global.broadcast({
          type: 'seasonReset',
          message: 'New season has started! Leaderboards reset.',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error during weekly reset:', error);
    }

    // Schedule next weekly reset
    scheduleWeeklyReset();
  }, timeUntilReset);

  console.log(`📅 Next weekly reset in ${Math.round(timeUntilReset / (60 * 60 * 1000))} hours`);
}

function scheduleShieldCleanup() {
  const cleanupInterval = 60 * 60 * 1000; // Every hour

  setInterval(async () => {
    try {
      await databaseService.removeExpiredShields();
      console.log('🛡️ Expired shields cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up shields:', error);
    }
  }, cleanupInterval);

  console.log('🛡️ Shield cleanup scheduled every hour');
}

module.exports = {
  startResetScheduler
};

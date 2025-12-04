# 🚀 Quick Start Guide

## Server Status: ✅ RUNNING

**URL**: http://localhost:3000

---

## What's New in This Release

### 🎮 Gameplay Improvements

1. **Tier System** - 4 progression levels (Bronze → Silver → Gold → Legendary)
2. **Balanced Missiles** - 50 click cost, 50% damage cap, 2-hour shields
3. **Fair Challenges** - Tier-aware warnings for unfair matchups
4. **Golden Bunbat** - 10-second clickable window instead of instant
5. **Seasonal Resets** - Weekly archives + daily cooldown resets
6. **Stats Tracking** - Wins, losses, missiles, damage taken

---

## How to Play

### Click Counter
- Click the Luci GIF to add to global counter
- Your country's clicks are tracked

### Missiles
1. Click missile button (bunbat missil.png)
2. Enter target country code
3. Must have 50+ clicks to launch
4. Click fast for 30 seconds to generate damage
5. Damage capped at 50% of target's clicks
6. 30-minute cooldown between launches
7. Target gets 2-hour shield after hit

### Challenges
1. Click challenge button (bunbat clicker.png)
2. Choose opponent and bet amount
3. Both countries click fast for 30 seconds
4. Higher click count wins
5. Winner gets both bets
6. Can't challenge if shield is active

### Golden Bunbat
- Appears randomly on screen
- You have 10 seconds to click it
- Click as many times as possible
- Bonus points for each click

### Ranking
- View live rankings on the right
- See your tier badge (🥉🥈🥇💎)
- Rankings update in real-time

---

## Tier System

| Tier | Emoji | Color | Clicks | Badge |
|------|-------|-------|--------|-------|
| Bronze | 🥉 | #CD7F32 | 0-999 | Beginner |
| Silver | 🥈 | #C0C0C0 | 1k-9.9k | Intermediate |
| Gold | 🥇 | #FFD700 | 10k-99.9k | Advanced |
| Legendary | 💎 | #FF1493 | 100k+ | Master |

---

## API Endpoints

### Ranking & Stats
- `GET /api/ranking/tiers` - Get rankings with tiers
- `GET /api/country/:code` - Get country info + stats
- `GET /api/stats/my-country` - Get your stats
- `GET /api/leaderboard` - Top 10 leaderboard

### Missiles
- `GET /api/missile/info` - Check missile status
- `POST /api/missile/launch` - Launch attack
- `GET /api/shield/status` - Check shield

### Challenges
- `POST /api/challenge` - Create challenge
- `GET /api/challenges` - List challenges
- `POST /api/challenge/:id/accept` - Accept
- `POST /api/challenge/:id/click` - Submit clicks

### Seasonal
- `GET /api/season/current` - Current season
- `GET /api/season/:name/leaderboard` - Past seasons

---

## Automatic Features

### Daily Reset (00:00 UTC)
- Clears all missile cooldowns
- Players can launch again

### Weekly Reset (Monday 00:00 UTC)
- Archives current season stats
- New leaderboard started
- Everyone begins fresh

### Hourly Cleanup
- Removes expired shields
- Database optimization

---

## Game Tips

1. **Missiles**: Save for when opponents have low clicks
2. **Challenges**: Fight similar-tier countries for fair odds
3. **Golden Bunbat**: Don't miss it! Quick reflexes = bonus points
4. **Shields**: Can't attack shielded countries - wait 2 hours
5. **Rank Up**: Accumulate clicks to reach higher tiers
6. **Weekly**: Seasonal reset coming - climb the new leaderboard!

---

## Help & Support

Click the help button (bunbat help.png) for:
- Game guide
- Feature explanations
- Pro tips
- Cooldown information

---

## Files Modified

### Frontend
- `public/ranking.js` - Tier display
- `public/missile.js` - Cost & shield info
- `public/challenge.js` - Tier comparison
- `public/golden.js` - 10-second window
- `public/index.html` - Updated UI

### Backend
- `server.js` - Added scheduler
- `services/databaseService.js` - New functions
- `services/resetScheduler.js` - NEW
- `routes/gameRoutes.js` - New endpoints

### Database
- Created: `country_stats`
- Created: `country_shields`
- Created: `seasonal_rankings`

---

## Troubleshooting

**Game not loading?**
- Check http://localhost:3000 is in browser
- Ensure server is running (see terminal)
- Clear browser cache (Ctrl+Shift+Delete)

**Missile not working?**
- Need 50+ clicks to launch
- Check cooldown timer
- Opponent shield blocks attacks

**Challenge error?**
- Opponent must have enough clicks
- Can't challenge shielded countries
- Check tier difference warning

**Golden bunbat missing?**
- Appears randomly
- Check if browser volume is on
- Refresh page if stuck

---

## Server Logs

```
✅ Database pool connection established
✅ Database connection test successful
✅ 🔄 Reset scheduler started
✅ 📅 Next daily reset in 1325 minutes
✅ 📅 Next weekly reset in 94 hours
✅ 🛡️ Shield cleanup scheduled every hour
✅ Server running at http://localhost:3000
```

---

## Documentation

- **IMPROVEMENTS_SUMMARY.md** - Full feature list
- **TESTING_CHECKLIST.md** - Test procedures
- **IMPLEMENTATION_COMPLETE.md** - Technical details

---

## Version Info

- **Release**: v2.0 Enhanced
- **Date**: December 4, 2025
- **Status**: ✅ Production Ready
- **Server**: Node.js + Express
- **Database**: PostgreSQL (Neon)
- **Real-time**: WebSocket

---

## Contact & Feedback

Report issues or suggest improvements via GitHub issues.

---

**Happy clicking! 🎮**


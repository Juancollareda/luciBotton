let isLive = false;
let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const clientID = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  
  if (!clientID || !clientSecret) {
    return null;
  }

  // Use cached token if valid
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientID,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Twitch token: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Expire 60 seconds early for safety
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    return accessToken;
  } catch (err) {
    console.error('Error getting Twitch OAuth token:', err);
    return null;
  }
}

async function checkTwitchLiveStatus() {
  const channel = process.env.TWITCH_CHANNEL || 'luciela_dh';
  const clientID = process.env.TWITCH_CLIENT_ID;
  
  if (!clientID) {
    // Twitch API credentials not defined. Do not poll.
    return;
  }

  const token = await getAccessToken();
  if (!token) {
    console.warn('[Twitch] Twitch credentials invalid or retrieval failed. Skipping check.');
    return;
  }

  try {
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${channel}`, {
      headers: {
        'Client-ID': clientID,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Twitch stream status fetch failed: ${response.statusText}`);
    }

    const resData = await response.json();
    const live = resData.data && resData.data.length > 0;
    
    if (live !== isLive) {
      isLive = live;
      console.log(`[Twitch] Streamer live status changed: ${isLive ? 'LIVE 🔴' : 'OFFLINE ⚪'}`);
      
      // Broadcast update to all connected clients
      if (global.broadcast) {
        global.broadcast({ type: 'streamStatus', data: { live: isLive } });
      }
    }
  } catch (err) {
    console.error('Error checking Twitch live status:', err);
  }
}

const twitchService = {
  getStreamStatus() {
    return isLive;
  },

  setLive(val) {
    const prev = isLive;
    isLive = !!val;
    if (prev !== isLive) {
      console.log(`[Twitch] Streamer live status manually changed: ${isLive ? 'LIVE 🔴' : 'OFFLINE ⚪'}`);
      if (global.broadcast) {
        global.broadcast({ type: 'streamStatus', data: { live: isLive } });
      }
    }
  },

  startPolling(intervalMs = 60000) {
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
      console.log('[Twitch] TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not configured. Running in Manual/Admin override mode.');
      return;
    }
    console.log(`[Twitch] Polling Twitch stream status for channel: ${process.env.TWITCH_CHANNEL || 'luciela_dh'} every ${intervalMs / 1000}s`);
    checkTwitchLiveStatus();
    setInterval(checkTwitchLiveStatus, intervalMs);
  }
};

module.exports = twitchService;

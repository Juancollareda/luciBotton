import { Count } from './count.js';
import { Ranking } from './ranking.js';
import { Boost } from './boost.js';
import { Missile } from './missile.js';
import { Modals } from './modals.js';
import { Golden } from './golden.js';
import { Effects } from './effects.js';
import { Chat } from './chat.js';

window.Missile = Missile; // para que modals.js pueda llamar a startFrenzy
window.Effects = Effects; // Expose globally for effects trigger

// Global alert modal function
window.showAlert = function(message, title = 'Alert') {
  const alertModal = document.getElementById('alertModal');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');
  const alertButton = document.getElementById('alertButton');
  
  alertTitle.textContent = title;
  alertMessage.textContent = message;
  alertModal.style.display = 'flex';
  
  alertButton.onclick = () => {
    alertModal.style.display = 'none';
  };
};

window.onload = () => {
  // Initialize modules
  Effects.init();
  Ranking.init();  // This sets up WebSocket connection
  Chat.init();     // Initialize chat module
  Count.init();
  Boost.checkStatus();
  Missile.checkStatus();
  Modals.init();
  Golden.init();
  
  // Set up click handler
  document.getElementById('mainClickButton').onclick = Count.click;

  // Collapsible Game Features Tooltip
  const toggleFeatures = document.getElementById('toggleFeatures');
  const featuresContent = document.getElementById('featuresContent');
  const featuresArrow = document.getElementById('featuresArrow');
  const featuresTooltip = document.getElementById('featuresTooltip');

  if (toggleFeatures && featuresContent && featuresArrow && featuresTooltip) {
    toggleFeatures.onclick = () => {
      if (featuresContent.style.display === 'none') {
        featuresContent.style.display = 'block';
        featuresArrow.textContent = '▼';
        featuresTooltip.style.padding = '15px';
      } else {
        featuresContent.style.display = 'none';
        featuresArrow.textContent = '▲';
        featuresTooltip.style.padding = '10px 15px';
      }
    };
  }

  // Collapsible Top Country Info
  const toggleTopCountry = document.getElementById('toggleTopCountry');
  const topFlag = document.getElementById('topFlag');
  const topCountryArrow = document.getElementById('topCountryArrow');

  if (toggleTopCountry && topFlag && topCountryArrow) {
    toggleTopCountry.onclick = () => {
      if (topFlag.style.display === 'none') {
        topFlag.style.display = 'flex';
        topCountryArrow.textContent = '▼';
      } else {
        topFlag.style.display = 'none';
        topCountryArrow.textContent = '▲';
      }
    };
  }

  // Set up periodic updates for non-WebSocket data
  setInterval(Count.update, 1000);
  setInterval(() => Boost.checkStatus(), 5000);
  setInterval(() => Missile.checkStatus(), 10000);
  setInterval(() => Golden.checkEndpoint(), 10000);

  // Listen for stream live status updates via WebSocket
  window.addEventListener('wsMessage', (event) => {
    const data = event.detail;
    if (data && data.type === 'streamStatus') {
      window.streamerLive = !!data.data.live;
      const banner = document.getElementById('liveIndicatorBanner');
      const dot = document.getElementById('liveIndicatorDot');
      const text = document.getElementById('liveIndicatorText');
      if (banner && dot && text) {
        if (window.streamerLive) {
          banner.classList.remove('offline');
          banner.classList.add('live');
          dot.textContent = '🔴';
          text.textContent = 'STREAM IS LIVE! 2X CLICKS ACTIVE!';
        } else {
          banner.classList.remove('live');
          banner.classList.add('offline');
          dot.textContent = '⚪';
          text.textContent = 'STREAM IS OFFLINE';
        }
      }
    }
  });
};

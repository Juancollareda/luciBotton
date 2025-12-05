import { Count } from './count.js';
import { Ranking } from './ranking.js';
import { Boost } from './boost.js';
import { Missile } from './missile.js';
import { Modals } from './modals.js';
import { Golden } from './golden.js';

window.Missile = Missile; // para que modals.js pueda llamar a startFrenzy

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
  Ranking.init();  // This sets up WebSocket connection
  Count.init();
  Boost.checkStatus();
  Missile.checkStatus();
  Modals.init();
  Golden.init();
  
  // Set up click handler
  document.getElementById('mainClickButton').onclick = Count.click;

  // Set up periodic updates for non-WebSocket data
  setInterval(Count.update, 1000);
  setInterval(() => Boost.checkStatus(), 5000);
  setInterval(() => Missile.checkStatus(), 10000);
  setInterval(() => Golden.checkEndpoint(), 10000);
};

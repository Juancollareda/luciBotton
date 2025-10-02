import { Count } from './count.js';
import { Ranking } from './ranking.js';
import { Boost } from './boost.js';
import { Missile } from './missile.js';
import { Modals } from './modals.js';
import { Golden } from './golden.js';

window.Missile = Missile; // para que modals.js pueda llamar a startFrenzy

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

  setInterval(Count.update, 1000);
  setInterval(() => Boost.checkStatus(), 5000);
  setInterval(() => Missile.checkStatus(), 10000);
  setInterval(() => Golden.checkEndpoint(), 10000);

  document.getElementById('mainClickButton').onclick = Count.click;
};

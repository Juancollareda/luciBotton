import { Count } from './count.js';
import { Ranking } from './ranking.js';
import { Boost } from './boost.js';
import { Missile } from './missile.js';
import { Modals } from './modals.js';
import { Golden } from './golden.js';

window.Missile = Missile; // para que modals.js pueda llamar a startFrenzy

window.onload = () => {
  Count.update();
  Ranking.update();
  Boost.checkStatus();
  Missile.checkStatus();
  Modals.init();
  Golden.init(); // initialize golden apple

  setInterval(Count.update, 1000);
  setInterval(Ranking.update, 5000);
  setInterval(() => Boost.checkStatus(), 5000);
  setInterval(() => Missile.checkStatus(), 10000);
  setInterval(() => Golden.checkEndpoint(), 10000); // poll backend

  document.querySelector('.gif-button').onclick = Count.click;
};

import { Count } from './count.js';
import { Ranking } from './ranking.js';
import { Boost } from './boost.js';
import { Missile } from './missile.js';
import { Modals } from './modals.js';

window.Missile = Missile; // para que modals.js pueda llamar a startFrenzy

window.onload = () => {
 Count.update();
  Ranking.update();
  Boost.checkStatus(); // revisa boost
  Missile.checkStatus();
  Modals.init();

  setInterval(Count.update, 1000);
  setInterval(Ranking.update, 5000);
  setInterval(() => Boost.checkStatus(), 5000); // <-- explícito
  setInterval(() => Missile.checkStatus(), 10000);

  document.querySelector('.gif-button').onclick = Count.click;
};
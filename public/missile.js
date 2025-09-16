export const Missile = {
  frenzyActive: false,
  frenzyCount: 0,

  checkStatus: () => {
    fetch('/missile-status')
      .then(res => res.json())
      .then(data => {
        const missileBtn = document.getElementById('missileButton');
        const statusEl = document.getElementById('missileStatus');

        if (data.canLaunch) {
          missileBtn.disabled = false;
          statusEl.textContent = "Missile ready!";
        } else {
          missileBtn.disabled = true;
          statusEl.textContent = `Missile already used. Next available in ${data.hours}h ${data.minutes}m ${data.seconds}s`;
        }
      })
      .catch(console.error);
  },

  startFrenzy: (target) => {
    const button = document.getElementById('frenzyMissileButton');
    const resultEl = document.getElementById('frenzyMissileResult');

    Missile.frenzyCount = 0;
    Missile.frenzyActive = true;
    button.style.display = 'inline-block';
    resultEl.textContent = 'Click as fast as you can!';

    let countdown = 30;
    button.textContent = `${countdown}s`;

    const interval = setInterval(() => {
      countdown--;
      button.textContent = `${countdown}s`;
      if (countdown <= 0) {
        clearInterval(interval);
        Missile.frenzyActive = false;
        button.style.display = 'none';
        resultEl.textContent = `You clicked ${Missile.frenzyCount} times! Missile power applied!`;

        fetch(`/missile?amount=${Missile.frenzyCount}&target=${target}`, { method: 'POST' })
          .then(res => res.text())
          .then(msg => {
            document.getElementById('missileStatus').textContent = msg;
          })
          .catch(console.error);
      }
    }, 1000);

    button.onclick = () => {
      if (Missile.frenzyActive) Missile.frenzyCount++;
    };
  }
};

export const Missile = {
  frenzyActive: false,
  frenzyCount: 0,
  MISSILE_COST: 50, // Clicks required to launch missile
  MAX_DAMAGE_PERCENT: 0.5, // Maximum damage is 50% of target's clicks

  checkStatus: () => {
    fetch('/api/missile/info')
      .then(res => res.json())
      .then(data => {
        const missileBtn = document.getElementById('navMissileButton');
        const statusEl = document.getElementById('missileStatus');

        if (data.canLaunch) {
          missileBtn.style.opacity = '1';
          missileBtn.style.pointerEvents = 'auto';
          statusEl.innerHTML = `<span style="color: #2ecc71;">✓ Missile ready!</span><br><small>Cost: ${Missile.MISSILE_COST} clicks | Max damage: ${Math.round(Missile.MAX_DAMAGE_PERCENT * 100)}% of target</small>`;
        } else {
          missileBtn.style.opacity = '0.5';
          missileBtn.style.pointerEvents = 'none';
          const hours = data.hours || 0;
          const minutes = data.minutes || 0;
          const seconds = data.seconds || 0;
          statusEl.innerHTML = `<span style="color: #e74c3c;">Missile cooldown active</span><br><small>Next available in ${hours}h ${minutes}m ${seconds}s</small>`;
        }

        // Show shield status if active
        if (data.isShielded && data.shieldTimeRemaining) {
          statusEl.innerHTML += `<br><span style="color: #f39c12;">🛡️ Shield Active: ${data.shieldTimeRemaining} remaining</span>`;
        }
      })
      .catch(console.error);
  },

  startFrenzy: (target) => {
    const button = document.getElementById('frenzyMissileButton');
    const resultEl = document.getElementById('frenzyMissileResult');

    // Get current player's click count
    fetch('/api/stats/my-country')
      .then(res => res.json())
      .then(data => {
        const myClicks = data.clicks || 0;
        const myCountry = data.country;

        if (myClicks < Missile.MISSILE_COST) {
          resultEl.innerHTML = `<span style="color: #e74c3c;">❌ Not enough clicks! Need ${Missile.MISSILE_COST} clicks, you have ${myClicks}</span>`;
          return;
        }

        Missile.frenzyCount = 0;
        Missile.frenzyActive = true;
        button.style.display = 'inline-block';
        resultEl.innerHTML = `<span style="color: #f39c12;">Click as fast as you can!</span><br><small>⚠️ This will cost ${Missile.MISSILE_COST} clicks</small>`;

        let countdown = 30;
        button.textContent = `${countdown}s`;

        const interval = setInterval(() => {
          countdown--;
          button.textContent = `${countdown}s`;
          if (countdown <= 0) {
            clearInterval(interval);
            Missile.frenzyActive = false;
            button.style.display = 'none';
            
            const damage = Math.min(Missile.frenzyCount, Math.floor(Missile.MAX_DAMAGE_PERCENT * myClicks));
            resultEl.innerHTML = `<span style="color: #2ecc71;">✓ You clicked ${Missile.frenzyCount} times!</span><br><small>Damage: ~${damage} clicks | Target loses up to ${damage} clicks (50% cap)</small>`;

            fetch(`/api/missile/launch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetCountry: target, damage: Missile.frenzyCount })
            })
              .then(res => res.json())
              .then(msg => {
                resultEl.innerHTML = `<span style="color: #2ecc71;">✓ Missile launched!</span><br>${msg.message || msg.error}`;
                Missile.checkStatus();
              })
              .catch(console.error);
          }
        }, 1000);

        button.onclick = () => {
          if (Missile.frenzyActive) Missile.frenzyCount++;
        };
      })
      .catch(console.error);
  }
};

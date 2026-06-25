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

    resultEl.innerHTML = `<span style="color: #f39c12;">Preparing launch...</span>`;

    // 1. Get my country and clicks
    fetch('/api/stats/my-country')
      .then(res => res.json())
      .then(myData => {
        const myClicks = myData.clicks || 0;
        const myCountry = myData.country;

        if (myClicks < Missile.MISSILE_COST) {
          resultEl.innerHTML = `<span style="color: #e74c3c;">❌ Not enough clicks! Need ${Missile.MISSILE_COST} clicks, you have ${myClicks}</span>`;
          return;
        }

        if (myCountry === target) {
          resultEl.innerHTML = `<span style="color: #e74c3c;">❌ You cannot launch a missile at your own country!</span>`;
          return;
        }

        // 2. Pre-validate target country
        fetch(`/api/country/${target}`)
          .then(res => {
            if (!res.ok) {
              return res.json().then(errData => {
                throw new Error(errData.error || 'Target country not found or has no clicks.');
              });
            }
            return res.json();
          })
          .then(targetData => {
            if (targetData.isShielded) {
              resultEl.innerHTML = `<span style="color: #e74c3c;">🛡️ Target country ${target} has an active shield!</span>`;
              return;
            }

            // All checks passed! Start the frenzy
            Missile.frenzyCount = 0;
            Missile.frenzyActive = true;
            button.style.display = 'flex';
            resultEl.innerHTML = `<span style="color: #f39c12;">🚀 Frenzy active! CLICK THE RED BUTTON FAST!</span><br><small>Cost: ${Missile.MISSILE_COST} clicks</small>`;

            let countdown = 30;
            button.innerHTML = `<span>CLICK FAST!</span><span style="font-size: 1.8rem; margin-top: 5px;">${countdown}s</span>`;

            const interval = setInterval(() => {
              countdown--;
              button.innerHTML = `<span>CLICK FAST!</span><span style="font-size: 1.8rem; margin-top: 5px;">${countdown}s</span>`;
              if (countdown <= 0) {
                clearInterval(interval);
                Missile.frenzyActive = false;
                button.style.display = 'none';
                resultEl.innerHTML = `<span style="color: #f39c12;">Launching missile...</span>`;

                // Launch the missile
                fetch(`/api/missile/launch`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ targetCountry: target, damage: Missile.frenzyCount })
                })
                  .then(async res => {
                    const data = await res.json();
                    if (!res.ok) {
                      throw new Error(data.error || 'Launch failed');
                    }
                    return data;
                  })
                  .then(msg => {
                    resultEl.innerHTML = `<span style="color: #2ecc71;">🚀 Missile launched successfully!</span><br>` +
                      `You clicked <strong>${Missile.frenzyCount}</strong> times.<br>` +
                      `<span style="color: #ffd700;">${msg.message}</span>`;
                    Missile.checkStatus();
                  })
                  .catch(err => {
                    resultEl.innerHTML = `<span style="color: #e74c3c;">❌ Missile Launch Failed</span><br>${err.message}`;
                    Missile.checkStatus();
                  });
              }
            }, 1000);

            button.onclick = () => {
              if (Missile.frenzyActive) {
                Missile.frenzyCount++;
                // Play click sound
                const clickSound = document.getElementById('clickSound');
                if (clickSound) {
                  const soundClone = clickSound.cloneNode(true);
                  soundClone.volume = 0.5;
                  soundClone.play().catch(() => {});
                }
              }
            };
          })
          .catch(err => {
            resultEl.innerHTML = `<span style="color: #e74c3c;">❌ Target Error: ${err.message}</span>`;
          });
      })
      .catch(err => {
        console.error('Error in startFrenzy:', err);
        resultEl.innerHTML = `<span style="color: #e74c3c;">❌ Error checking country stats</span>`;
      });
  }
};

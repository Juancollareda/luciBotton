
let boostInterval = null;
let boostRemaining = 0;
let bgFlashInterval = null;
let flashState = false;

// Count update
function updateCount() {
  fetch('/count')
    .then(res => res.text())
    .then(data => { document.getElementById('response').innerText = data; })
    .catch(console.error);
}

// Ranking update
function updateRanking() {
  fetch('/paises')
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('rankingBody');
      tbody.innerHTML = '';
      const topFlag = document.getElementById('topFlag');

      data.forEach((row, index) => {
        const tr = document.createElement('tr');
        let countryDisplay = row.country_code;

        if (index === 0) {
          const flagUrl = `https://flagcdn.com/256x192/${row.country_code.toLowerCase()}.png`;
          topFlag.innerHTML = `<img src="${flagUrl}" alt="${row.country_code}" style="height:96px;margin-right:20px;">Top country`;
        }

        tr.innerHTML = `<td>${countryDisplay}</td><td>${row.clicks}</td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

// Regular button click
function clickButton() {
  fetch('/clicked')
    .then(res => res.text())
    .then(data => {
      document.getElementById('response2').innerText = "wololo Counter: " + data;
      const sound = document.getElementById('clickSound');
      sound.currentTime = 0;
      sound.play();
      updateRanking();
    })
    .catch(console.error);
}

// Boost timer
function checkBoostStatus() {
  fetch('/boost-status')
    .then(res => res.json())
    .then(data => {
      boostRemaining = data.expiresIn;
      if (data.boost === "ON") startBoostTimer();
      else {
        document.getElementById('boostTimer').textContent = "Boost: OFF";
        clearInterval(boostInterval);
      }
    })
    .catch(console.error);
}

function startBoostTimer() {
  const timerEl = document.getElementById('boostTimer');
  clearInterval(boostInterval);
  if (bgFlashInterval) clearInterval(bgFlashInterval);
  flashState = false;

  if (boostRemaining > 0) {
    timerEl.textContent = "Boost Active: " + boostRemaining + "s";

    bgFlashInterval = setInterval(() => {
      document.body.style.background = flashState
        ? "linear-gradient(to right, #ff4d4d 50%, #000000 50%)"
        : "linear-gradient(to right, #000000 50%, #ff4d4d 50%)";
      flashState = !flashState;
    }, 500);

    boostInterval = setInterval(() => {
      boostRemaining--;
      if (boostRemaining > 0) timerEl.textContent = "Boost Active: " + boostRemaining + "s";
      else {
        timerEl.textContent = "Boost: OFF";
        clearInterval(boostInterval);
        clearInterval(bgFlashInterval);
        document.body.style.background = "linear-gradient(to right, #ff4d4d 50%, #000000 50%)";
      }
    }, 1000);
  } else timerEl.textContent = "Boost: OFF";
}

// Missile logic
function checkMissileStatus() {
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
        statusEl.textContent = `Missile already used today. Next available in ${data.hours}h ${data.minutes}m`;
      }
    })
    .catch(console.error);
}
// Frenzy click logic
let frenzyActive = false;
let frenzyCount = 0;

function startMissileFrenzy(target) {
  const button = document.getElementById('frenzyMissileButton');
  const resultEl = document.getElementById('frenzyMissileResult');

  frenzyCount = 0;
  frenzyActive = true;
  button.style.display = 'inline-block';
  resultEl.textContent = 'Click as fast as you can!';

  let countdown = 10;
  button.textContent = `${countdown}s`;

  const interval = setInterval(() => {
    countdown--;
    button.textContent = `${countdown}s`;
    if (countdown <= 0) {
      clearInterval(interval);
      frenzyActive = false;
      button.style.display = 'none';
      resultEl.textContent = `You clicked ${frenzyCount} times! Missile power applied!`;

     fetch(`/missile?amount=${frenzyCount}&target=${target}`, { method: 'POST' })
    .then(res => res.text())
    .then(msg => {
      document.getElementById('missileStatus').textContent = msg;
      updateCount();
      updateRanking();

      // now refresh cooldown for this target
      checkMissileStatusForTarget(target);
    })
    .catch(console.error);
}
    
  }, 1000);

  button.onclick = () => {
    if (frenzyActive) frenzyCount++;
  };
}

function launchMissile() {
  fetch('/paises')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('missileTargetContainer');
      const select = document.getElementById('missileTarget');
      select.innerHTML = '';
      data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.country_code;
        opt.text = c.country_code;
        select.appendChild(opt);
      });

      container.style.display = 'block';
      const confirmBtn = document.getElementById('confirmMissile');
      confirmBtn.style.display = 'inline-block';

      let countdown = 10;
      const timerEl = document.getElementById('missileTimer');
      timerEl.textContent = ` ${countdown}s`;

      const interval = setInterval(() => {
        countdown--;
        timerEl.textContent = ` ${countdown}s`;
        if (countdown <= 0) {
          clearInterval(interval);
          confirmBtn.style.display = 'none';
          timerEl.textContent = '';
        }
      }, 1000);

      confirmBtn.onclick = () => {
        const target = select.value;
        if (!target) return;

        // Start the frenzy clicks
        startMissileFrenzy(target, () => {
          // Callback after frenzy ends
          checkMissileStatusForTarget(target);
        });

        clearInterval(interval);
        confirmBtn.style.display = 'none';
        timerEl.textContent = '';
      };
    });
}

// Update missile status for a specific target
function checkMissileStatusForTarget(target) {
  fetch(`/missile-status?target=${target}`)
    .then(res => res.json())
    .then(data => {
      const missileBtn = document.getElementById('missileButton');
      const statusEl = document.getElementById('missileStatus');
      if (data.canLaunch) {
        missileBtn.disabled = false;
        statusEl.textContent = "Missile ready!";
      } else {
        missileBtn.disabled = true;
        statusEl.textContent = `Missile already used today. Next available in ${data.hours}h ${data.minutes}m`;
      }
    })
    .catch(console.error);
}

// Window onload
window.onload = () => {
  updateCount();
  updateRanking();
  checkMissileStatus();
  checkBoostStatus();

  setInterval(updateCount, 1000);
  setInterval(updateRanking, 5000);
  setInterval(checkBoostStatus, 5000);
  setInterval(checkMissileStatus, 10000);
};
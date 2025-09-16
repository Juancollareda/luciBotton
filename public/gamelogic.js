let boostInterval = null;
let boostRemaining = 0;
let bgFlashInterval = null;
let flashState = false;
let frenzyActive = false;
let frenzyCount = 0;

// ====================== COUNT ======================
function updateCount() {
  fetch('/count')
    .then(res => res.text())
    .then(data => {
      document.getElementById('response').innerText = data;
    })
    .catch(console.error);
}

// ====================== RANKING ======================
function updateRanking() {
  fetch('/paises')
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('rankingBody');
      tbody.innerHTML = '';
      const topFlag = document.getElementById('topFlag');

      data.forEach((row, index) => {
        const tr = document.createElement('tr');
        const countryDisplay = row.country_code;

        if (index === 0) {
          const flagUrl = `https://flagcdn.com/256x192/${row.country_code.toLowerCase()}.png`;
          topFlag.innerHTML = `<img src="${flagUrl}" alt="${row.country_code}" style="height:96px;margin-right:20px;">Top country`;
        }

        tr.innerHTML = `<td>${countryDisplay}</td><td>${row.clicks}</td>`;
        tbody.appendChild(tr);
      });

      // Refresh datalist for missile input
      const datalist = document.getElementById("countriesList");
      if (datalist) {
        datalist.innerHTML = '';
        data.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.country_code;
          datalist.appendChild(opt);
        });
      }
    })
    .catch(console.error);
}

// ====================== BUTTON CLICK ======================
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

// ====================== BOOST ======================
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
      if (boostRemaining > 0) {
        timerEl.textContent = "Boost Active: " + boostRemaining + "s";
      } else {
        timerEl.textContent = "Boost: OFF";
        clearInterval(boostInterval);
        clearInterval(bgFlashInterval);
        document.body.style.background = "linear-gradient(to right, #ff4d4d 50%, #000000 50%)";
      }
    }, 1000);
  } else timerEl.textContent = "Boost: OFF";
}

// ====================== MISSILE ======================
function checkMissileStatus() {
  fetch('/missile-status') // <--- Sin target, revisa el país que lanza
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
}

// Frenzy logic
function startMissileFrenzy(target) {
  const button = document.getElementById('frenzyMissileButton');
  const resultEl = document.getElementById('frenzyMissileResult');

  frenzyCount = 0;
  frenzyActive = true;
  button.style.display = 'inline-block';
  resultEl.textContent = 'Click as fast as you can!';

  let countdown = 30;
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
          checkMissileStatus(); // revisa cooldown del país que lanzó
        })
        .catch(console.error);
    }
  }, 1000);

  button.onclick = () => {
    if (frenzyActive) frenzyCount++;
  };
}

// ====================== MODALS ======================
const missileModal = document.getElementById("missileModal");
const cooldownModal = document.getElementById("cooldownModal");
const cooldownMsg = document.getElementById("cooldownMessage");
const helpModal = document.getElementById("HelpModal");
const navHelpButton = document.getElementById("navHelpButton");
const navMissileButton = document.getElementById("navMissileButton");
const closeModal = document.getElementById("closeModal");
const closeCooldown = document.getElementById("closeCooldown");
const manualLaunchBtn = document.getElementById("manualLaunch");
const closeHelp = document.getElementById("closeHelp");

navMissileButton.onclick = () => missileModal.style.display = "flex";
closeModal.onclick = () => missileModal.style.display = "none";
closeCooldown.onclick = () => cooldownModal.style.display = "none";
navHelpButton.onclick = () => helpModal.style.display = "flex";
closeHelp.onclick = () => helpModal.style.display = "none";

window.onclick = (e) => {
  if (e.target === missileModal) missileModal.style.display = "none";
  if (e.target === cooldownModal) cooldownModal.style.display = "none";
  if (e.target === helpModal) helpModal.style.display = "none";
};

// Manual missile launch
manualLaunchBtn.onclick = () => {
  const target = document.getElementById("manualCountry").value.trim().toUpperCase();
  if (!target) return;

  // Solo revisamos el cooldown del país que lanza
  fetch(`/missile-status`)
    .then(res => res.json())
    .then(data => {
      if (!data.canLaunch) {
        cooldownMsg.textContent = `Missile already used. Next available in ${data.hours}h ${data.minutes}m ${data.seconds}s.`;
        cooldownModal.style.display = "flex";
      } else {
        startMissileFrenzy(target);
      }
    })
    .catch(console.error);

  missileModal.style.display = "none";
};

// ====================== INIT ======================
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

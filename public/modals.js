export const Modals = {
  init: () => {
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
            // Start frenzy (importante: se debe usar Missile.startFrenzy desde main.js)
            if (window.Missile) window.Missile.startFrenzy(target);
          }
        })
        .catch(console.error);

      missileModal.style.display = "none";
    };
  }
};

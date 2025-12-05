export const Modals = {
  init: () => {
    const missileModal = document.getElementById("missileModal");
    const cooldownModal = document.getElementById("cooldownModal");
    const helpModal = document.getElementById("HelpModal");
    const shopModal = document.getElementById("shopModal");
    const navHelpButton = document.getElementById("navHelpButton");
    const navShopButton = document.getElementById("navShopButton");
    const navMissileButton = document.getElementById("navMissileButton");
    const closeModal = document.getElementById("closeModal");
    const closeCooldown = document.getElementById("closeCooldown");
    const closeHelp = document.getElementById("closeHelp");
    const closeShop = document.getElementById("closeShop");
    const manualLaunchBtn = document.getElementById("manualLaunch");

    // Simple onclick handlers
    if (navMissileButton && missileModal) {
      navMissileButton.onclick = () => {
        missileModal.style.display = "flex";
      };
    }
    
    if (navHelpButton && helpModal) {
      navHelpButton.onclick = () => {
        helpModal.style.display = "flex";
      };
    }
    
    if (navShopButton && shopModal) {
      navShopButton.onclick = () => {
        shopModal.style.display = "flex";
        if (window.loadShop) window.loadShop();
      };
    }

    if (closeModal && missileModal) {
      closeModal.onclick = () => {
        missileModal.style.display = "none";
      };
    }
    
    if (closeCooldown && cooldownModal) {
      closeCooldown.onclick = () => {
        cooldownModal.style.display = "none";
      };
    }
    
    if (closeHelp && helpModal) {
      closeHelp.onclick = () => {
        helpModal.style.display = "none";
      };
    }
    
    if (closeShop && shopModal) {
      closeShop.onclick = () => {
        shopModal.style.display = "none";
      };
    }

    // Close modals when clicking outside
    window.onclick = function(event) {
      if (event.target === missileModal) {
        missileModal.style.display = "none";
      }
      if (event.target === cooldownModal) {
        cooldownModal.style.display = "none";
      }
      if (event.target === helpModal) {
        helpModal.style.display = "none";
      }
      if (event.target === shopModal) {
        shopModal.style.display = "none";
      }
    };

    if (manualLaunchBtn) {
      manualLaunchBtn.onclick = () => {
        const countryInput = document.getElementById("manualCountry");
        if (!countryInput) return;
        
        const target = countryInput.value.trim().toUpperCase();
        if (!target) return;

        fetch(`/missile-status`)
          .then(res => res.json())
          .then(data => {
            if (!data.canLaunch) {
              const cooldownMsg = document.getElementById("cooldownMessage");
              if (cooldownMsg) {
                cooldownMsg.textContent = `Missile already used. Next available in ${data.hours}h ${data.minutes}m ${data.seconds}s.`;
              }
              if (cooldownModal) cooldownModal.style.display = "flex";
            } else {
              if (window.Missile) window.Missile.startFrenzy(target);
            }
          })
          .catch(console.error);

        if (missileModal) missileModal.style.display = "none";
      };
    }
  }
};

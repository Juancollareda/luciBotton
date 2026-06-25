export const Count = {
  init() {
    // No need for WebSocket here, it's handled in ranking.js
    this.update();
  },

  update: () => {
    fetch('/count')
      .then(res => res.text())
      .then(data => document.getElementById('response').innerText = data)
      .catch(console.error);
  },

  click: (event) => {
    // Optimistically update UI
    const sound = document.getElementById('clickSound');
    sound.currentTime = 0;
    sound.play();

    // Spawn floating click particle at click coordinates
    if (window.Effects) {
      const x = event ? event.clientX : window.innerWidth / 2;
      const y = event ? event.clientY : window.innerHeight / 2;
      
      // Determine click value
      let clicksAdded = 1;
      const boostTimerEl = document.getElementById('boostTimer');
      if (boostTimerEl && boostTimerEl.textContent.includes('Active')) {
        clicksAdded = 2;
      }
      
      if (window.streamerLive) {
        clicksAdded *= 2;
      }
      
      window.Effects.spawnParticle(x, y, `+${clicksAdded}`);
    }

    fetch('/clicked')
      .then(res => res.text())
      .then(data => {
        document.getElementById('response2').innerText = "wololo Counter: " + data;
      })
      .catch(err => {
        console.error('Error clicking:', err);
        document.getElementById('response2').innerText = "Error occurred while clicking";
      });
  }
};

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

  click: () => {
    // Optimistically update UI
    const sound = document.getElementById('clickSound');
    sound.currentTime = 0;
    sound.play();

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

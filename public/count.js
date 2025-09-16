export const Count = {
  update: () => {
    fetch('/count')
      .then(res => res.text())
      .then(data => document.getElementById('response').innerText = data)
      .catch(console.error);
  },
  click: () => {
    fetch('/clicked')
      .then(res => res.text())
      .then(data => {
        document.getElementById('response2').innerText = "wololo Counter: " + data;
        const sound = document.getElementById('clickSound');
        sound.currentTime = 0;
        sound.play();
      })
      .catch(console.error);
  }
};

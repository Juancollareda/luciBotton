export const Boost = {
  state: { interval: null, remaining: 0, flashInterval: null, flashState: false },
  checkStatus: () => {
    fetch('/boost-status')
      .then(res => res.json())
      .then(data => {
        Boost.state.remaining = data.expiresIn;
        if (data.boost === "ON") Boost.startTimer();
        else {
          document.getElementById('boostTimer').textContent = "Boost: OFF";
          clearInterval(Boost.state.interval);
        }
      })
      .catch(console.error);
  },
  startTimer: () => {
    const timerEl = document.getElementById('boostTimer');
    clearInterval(Boost.state.interval);
    if (Boost.state.flashInterval) clearInterval(Boost.state.flashInterval);
    Boost.state.flashState = false;

    if (Boost.state.remaining > 0) {
      timerEl.textContent = "Boost Active: " + Boost.state.remaining + "s";

      Boost.state.flashInterval = setInterval(() => {
        document.body.style.background = Boost.state.flashState
          ? "linear-gradient(to right, #ff4d4d 50%, #000000 50%)"
          : "linear-gradient(to right, #000000 50%, #ff4d4d 50%)";
        Boost.state.flashState = !Boost.state.flashState;
      }, 500);

      Boost.state.interval = setInterval(() => {
        Boost.state.remaining--;
        if (Boost.state.remaining > 0) timerEl.textContent = "Boost Active: " + Boost.state.remaining + "s";
        else {
          timerEl.textContent = "Boost: OFF";
          clearInterval(Boost.state.interval);
          clearInterval(Boost.state.flashInterval);
          document.body.style.background = "linear-gradient(to right, #ff4d4d 50%, #000000 50%)";
        }
      }, 1000);
    } else timerEl.textContent = "Boost: OFF";
  }
};


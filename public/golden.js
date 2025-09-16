const Golden = {
  score: 0,
  apple: null,
  scoreDisplay: null,

  // función para esperar a que un elemento exista en el DOM
  waitForElement(selector, callback) {
    const el = document.querySelector(selector);
    if (el) return callback(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        callback(el);
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },

  init() {
    // esperamos a que #apple exista
    this.waitForElement("#apple", (appleEl) => {
      this.apple = appleEl;

      // Si querés usar #score, descomenta la siguiente línea
      // this.scoreDisplay = document.getElementById("score");

      // Setup click handler
      this.apple.addEventListener("click", async () => {
        this.apple.style.display = "none"; // hide apple

        try {
          console.log("Golden apple clicked, reporting to server...");
          const res = await fetch("/clickedgolden");
          const text = await res.text();
          console.log("Server response:", text);
    

          // si querés mostrar el score:
          // if (this.scoreDisplay) this.scoreDisplay.textContent = text;
        } catch (err) {
          console.error("Error reporting golden click:", err);
        }
      });
    });
  },

  spawnApple() {
    if (!this.apple) return; // si no existe, no hacemos nada

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const x = Math.random() * (screenW - 80);
    const y = Math.random() * (screenH - 80);

    this.apple.style.left = `${x}px`;
    this.apple.style.top = `${y}px`;
    this.apple.style.display = "block";
  },

  async checkEndpoint() {
    try {
      const res = await fetch("/spawn-apple");
      const data = await res.json();

      if (data.spawn) {
        this.spawnApple();
      }
    } catch (err) {
      console.error("Error checking spawn-apple:", err);
    }
  }
};

export { Golden };

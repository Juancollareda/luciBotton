const Golden = {
  score: 0,
  apple: null,
  scoreDisplay: null,
  _cooldown: false, // cooldown interno
  _clickActive: false, // Track if apple is currently clickable
  _clickCount: 0, // Count clicks on current apple

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

      // Setup click handler with 10 second active window
      this.apple.addEventListener("click", async () => {
        if (!this._clickActive) return;
        
        this._clickCount++;
        
        // Visual feedback on click
        this.apple.style.transform = 'scale(1.1)';
        setTimeout(() => {
          this.apple.style.transform = 'scale(1)';
        }, 100);

        try {
          console.log(`Golden apple click #${this._clickCount}, reporting to server...`);
          const res = await fetch("/clickedgolden");
          const text = await res.text();
          console.log("Server response:", text);

          // Update score if element exists
          // if (this.scoreDisplay) this.scoreDisplay.textContent = text;
        } catch (err) {
          console.error("Error reporting golden click:", err);
        }
      });
    });
  },

  spawnApple() {
    if (!this.apple || this._cooldown) return; // no spawn si en cooldown

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const x = Math.random() * (screenW - 80);
    const y = Math.random() * (screenH - 80);

    this.apple.style.left = `${x}px`;
    this.apple.style.top = `${y}px`;
    this.apple.style.display = "block";
    this.apple.style.cursor = 'pointer';
    this.apple.style.animation = 'bounce 0.5s ease-in-out';

    // Reset click count and make clickable
    this._clickCount = 0;
    this._clickActive = true;

    // Broadcast notification to other players
    try {
      fetch('/api/golden/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spawned_at: new Date() })
      }).catch(err => console.error('Could not broadcast spawn:', err));
    } catch (err) {
      console.error('Golden broadcast error:', err);
    }

    // Activar cooldown: apple is clickable for 10 seconds
    this._cooldown = true;
    const activeTime = 10000; // 10 seconds
    
    const countdownInterval = setInterval(() => {
      // Visual countdown effect
      const opacity = 1 - ((10000 - activeTime) / 10000) * 0.5;
      this.apple.style.opacity = Math.max(0.5, opacity);
    }, 100);

    setTimeout(() => {
      clearInterval(countdownInterval);
      this._clickActive = false; // No longer clickable
      this.apple.style.opacity = '1';
      
      // Hide the apple after 10 seconds
      this.apple.style.display = "none";
      this._cooldown = false;
      
      console.log(`Golden bunbat disappeared after being clicked ${this._clickCount} times`);
    }, activeTime);
  },

  async checkEndpoint() {
    try {
      const res = await fetch("/spawn-apple");
      const data = await res.json();

      if (data.spawn) {
        console.log('Golden bunbat spawn signal received!');
        this.spawnApple();
      }
    } catch (err) {
      console.error("Error checking spawn-apple:", err);
    }
  }
};

export { Golden };

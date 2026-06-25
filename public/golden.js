const Golden = {
  apple: null,
  _cooldown: false, // Internal cooldown to prevent double spawns
  _clickActive: false, // Track if apple is currently clickable
  _timeoutId: null, // Timeout to hide apple
  _intervalId: null, // Interval for visual fade out

  // Helper function to wait for elements to exist in the DOM
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
    this.waitForElement("#apple", (appleEl) => {
      this.apple = appleEl;

      // Click event handler
      this.apple.addEventListener("click", async (event) => {
        if (!this._clickActive) return;
        
        // Disable further clicking immediately
        this._clickActive = false;
        
        // Spawn floating golden click particle (+1000)
        if (window.Effects) {
          const x = event ? event.clientX : window.innerWidth / 2;
          const y = event ? event.clientY : window.innerHeight / 2;
          window.Effects.spawnParticle(x, y, '+1000');
        }
        
        // Hide the apple immediately after the first click
        this.hideApple();

        try {
          console.log(`Golden apple clicked once, reporting to server...`);
          const res = await fetch("/clickedgolden");
          const text = await res.text();
          console.log("Server response:", text);
        } catch (err) {
          console.error("Error reporting golden click:", err);
        }
      });
    });
  },

  spawnApple() {
    if (!this.apple || this._cooldown) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Safe zones: padding from left/right edges, top header, and bottom toolbar
    const paddingX = 80;
    const paddingTop = 120;
    const paddingBottom = 160;

    // Calculate safe coordinates relative to the viewport
    const x = paddingX + Math.random() * (width - paddingX * 2);
    const y = paddingTop + Math.random() * (height - (paddingTop + paddingBottom));

    this.apple.style.left = `${x}px`;
    this.apple.style.top = `${y}px`;
    this.apple.style.display = "block";
    this.apple.style.cursor = 'pointer';
    this.apple.style.animation = 'bounce 0.5s ease-in-out';

    this._clickActive = true;
    this._cooldown = true;

    // Broadcast spawn notification to other players
    try {
      fetch('/api/golden/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spawned_at: new Date() })
      }).catch(err => console.error('Could not broadcast spawn:', err));
    } catch (err) {
      console.error('Golden broadcast error:', err);
    }

    // Set countdown timers (apple remains visible for 10 seconds)
    const activeTime = 10000;
    let startTime = Date.now();

    if (this._timeoutId) clearTimeout(this._timeoutId);
    if (this._intervalId) clearInterval(this._intervalId);

    // Smooth visual fade out countdown
    this._intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const opacity = 1 - (elapsed / activeTime) * 0.5;
      if (this.apple) {
        this.apple.style.opacity = Math.max(0.5, opacity);
      }
    }, 100);

    this._timeoutId = setTimeout(() => {
      this.hideApple();
      console.log('Golden bunbat disappeared without being clicked.');
    }, activeTime);
  },

  hideApple() {
    // Clear timers
    if (this._timeoutId) clearTimeout(this._timeoutId);
    if (this._intervalId) clearInterval(this._intervalId);
    this._timeoutId = null;
    this._intervalId = null;

    this._clickActive = false;
    this._cooldown = false;

    if (this.apple) {
      this.apple.style.display = "none";
      this.apple.style.opacity = '1';
    }
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

export const Effects = {
  cursorDot: null,
  cursorRing: null,
  frenzyGlow: null,
  
  // Mouse position and interpolated ring position
  mouse: { x: 0, y: 0 },
  ringPos: { x: 0, y: 0 },
  isHovering: false,
  isMobile: false,

  init() {
    this.isMobile = !window.matchMedia('(min-width: 769px)').matches;

    // 1. Create frenzy mode glow overlay
    this.frenzyGlow = document.createElement('div');
    this.frenzyGlow.className = 'frenzy-glow-overlay';
    document.body.appendChild(this.frenzyGlow);

    if (this.isMobile) return; // Skip custom cursor on mobile/touch screens

    // 2. Create custom cursor elements
    this.cursorDot = document.createElement('div');
    this.cursorDot.className = 'custom-cursor-dot';
    this.cursorDot.style.display = 'block';

    this.cursorRing = document.createElement('div');
    this.cursorRing.className = 'custom-cursor-ring';
    this.cursorRing.style.display = 'block';

    document.body.appendChild(this.cursorDot);
    document.body.appendChild(this.cursorRing);

    // 3. Track mouse movement
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      
      this.cursorDot.style.top = `${this.mouse.y}px`;
      this.cursorDot.style.left = `${this.mouse.x}px`;
    });

    // 4. Update ring position with smooth lerp interpolation
    const updateRing = () => {
      // Lerp coefficient (0.15 = 15% of the distance each frame for smooth spring action)
      const ease = 0.15;
      
      this.ringPos.x += (this.mouse.x - this.ringPos.x) * ease;
      this.ringPos.y += (this.mouse.y - this.ringPos.y) * ease;

      this.cursorRing.style.top = `${this.ringPos.y}px`;
      this.cursorRing.style.left = `${this.ringPos.x}px`;

      requestAnimationFrame(updateRing);
    };
    updateRing();

    // 5. Setup hover listeners for interactive elements
    this.setupHoverListeners();

    // Re-bind hover listeners when DOM changes (modals opening, dynamic rankings)
    const observer = new MutationObserver(() => this.setupHoverListeners());
    observer.observe(document.body, { childList: true, subtree: true });
  },

  setupHoverListeners() {
    if (this.isMobile) return;

    const hoverableSelector = 'button, a, input, select, [role="button"], td, .close-btn, img.gif-button';
    const elements = document.querySelectorAll(hoverableSelector);

    elements.forEach(el => {
      // Avoid duplicate binding
      if (el.dataset.hasCursorHover) return;
      el.dataset.hasCursorHover = 'true';

      el.addEventListener('mouseenter', () => {
        document.body.classList.add('custom-cursor-hover');
      });

      el.addEventListener('mouseleave', () => {
        document.body.classList.remove('custom-cursor-hover');
      });
    });
  },

  // Spawn floating text particle
  spawnParticle(x, y, text = '+1') {
    const particle = document.createElement('div');
    particle.className = 'click-particle';
    particle.textContent = text;
    
    // Slight random offset so overlapping clicks scatter nicely
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 15;
    
    particle.style.left = `${x + offsetX}px`;
    particle.style.top = `${y + offsetY}px`;

    document.body.appendChild(particle);

    // Clean up particle DOM after animation completes (0.8s)
    setTimeout(() => {
      particle.remove();
    }, 800);
  },

  // Toggle screen border red pulse glow (Frenzy Mode)
  setFrenzyGlow(active) {
    if (active) {
      this.frenzyGlow.classList.add('frenzy-active-glow');
    } else {
      this.frenzyGlow.classList.remove('frenzy-active-glow');
    }
  }
};

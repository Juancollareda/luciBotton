(function() {
  // Inject CSS Styles dynamically into the page head
  const css = `
    .cyber-portal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(4, 5, 8, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s, visibility 0.3s;
      font-family: 'Share Tech Mono', 'Orbitron', monospace;
    }

    .cyber-portal-overlay.show {
      opacity: 1;
      visibility: visible;
    }

    .cyber-portal-box {
      width: 380px;
      max-width: 90%;
      background: rgba(14, 16, 22, 0.95);
      border: 1px solid rgba(229, 9, 20, 0.5);
      border-radius: 12px;
      box-shadow: 0 0 35px rgba(229, 9, 20, 0.25), inset 0 0 15px rgba(0, 0, 0, 0.8);
      padding: 30px 24px;
      position: relative;
      transform: scale(0.9);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .cyber-portal-overlay.show .cyber-portal-box {
      transform: scale(1);
    }

    .cyber-portal-box::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, #e50914, #ff3333, #e50914);
      border-radius: 12px 12px 0 0;
    }

    .cyber-portal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }

    .portal-title-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .portal-title {
      font-size: 16px;
      font-weight: bold;
      color: #fff;
      letter-spacing: 2px;
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
    }

    .portal-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #e50914;
      box-shadow: 0 0 8px #e50914;
      animation: portal-pulse 1.2s infinite alternate;
    }

    @keyframes portal-pulse {
      0% { opacity: 0.3; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1.1); }
    }

    .portal-close-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 22px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      transition: color 0.2s;
    }

    .portal-close-btn:hover {
      color: #ff3333;
    }

    .portal-instructions {
      font-size: 11px;
      color: #888;
      letter-spacing: 1.5px;
      margin-bottom: 15px;
      text-transform: uppercase;
      text-align: center;
    }

    .portal-input-wrapper {
      position: relative;
      margin-bottom: 20px;
    }

    .portal-input-wrapper input {
      width: 100%;
      padding: 12px 15px;
      background: rgba(5, 5, 5, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: #fff;
      font-family: 'Share Tech Mono', monospace;
      font-size: 14px;
      letter-spacing: 3px;
      text-align: center;
      transition: all 0.3s;
      box-sizing: border-box;
    }

    .portal-input-wrapper input:focus {
      outline: none;
      border-color: #e50914;
      box-shadow: 0 0 12px rgba(229, 9, 20, 0.25);
    }

    .portal-submit-btn {
      width: 100%;
      padding: 12px;
      background: #e50914;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      font-size: 13px;
      letter-spacing: 2.5px;
      cursor: pointer;
      font-family: 'Share Tech Mono', monospace;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(229, 9, 20, 0.2);
    }

    .portal-submit-btn:hover {
      background: #ff222d;
      box-shadow: 0 4px 18px rgba(229, 9, 20, 0.45);
      transform: translateY(-1px);
    }

    .portal-feedback {
      margin-top: 15px;
      font-size: 11px;
      letter-spacing: 1px;
      text-align: center;
      min-height: 16px;
    }

    .portal-feedback.error {
      color: #ff3333;
      text-shadow: 0 0 8px rgba(255, 51, 51, 0.3);
    }

    .portal-feedback.success {
      color: #00ff66;
      text-shadow: 0 0 8px rgba(0, 255, 102, 0.3);
    }

    .portal-shake {
      animation: portal-shake-anim 0.5s ease-in-out;
    }

    @keyframes portal-shake-anim {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
      20%, 40%, 60%, 80% { transform: translateX(6px); }
    }
  `;

  // Append CSS to head
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Setup dynamic HTML elements
  let overlayEl = null;
  let inputEl = null;
  let feedbackEl = null;
  let boxEl = null;

  function createPortalModal() {
    overlayEl = document.createElement('div');
    overlayEl.className = 'cyber-portal-overlay';
    overlayEl.id = 'cyber-admin-portal-modal';

    overlayEl.innerHTML = `
      <div class="cyber-portal-box">
        <div class="cyber-portal-header">
          <div class="portal-title-wrapper">
            <span class="portal-dot"></span>
            <span class="portal-title">ADMIN INTERFACE</span>
          </div>
          <button class="portal-close-btn">&times;</button>
        </div>
        <div class="cyber-portal-body">
          <p class="portal-instructions">DECRYPTION AUTHENTICATION REQUIRED</p>
          <div class="portal-input-wrapper">
            <input type="password" id="cyber-portal-pwd-input" placeholder="ACCESS KEY..." autocomplete="off">
          </div>
          <button class="portal-submit-btn" id="cyber-portal-submit-btn">INITIALIZE LINK</button>
          <div id="cyber-portal-feedback" class="portal-feedback"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlayEl);
    
    // Select internal elements
    boxEl = overlayEl.querySelector('.cyber-portal-box');
    inputEl = overlayEl.querySelector('#cyber-portal-pwd-input');
    feedbackEl = overlayEl.querySelector('#cyber-portal-feedback');

    // Bind event listeners
    overlayEl.querySelector('.portal-close-btn').addEventListener('click', hideModal);
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) hideModal();
    });

    overlayEl.querySelector('#cyber-portal-submit-btn').addEventListener('click', submitPassword);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitPassword();
    });
  }

  function showModal() {
    if (!overlayEl) createPortalModal();
    overlayEl.classList.add('show');
    feedbackEl.className = 'portal-feedback';
    feedbackEl.innerHTML = '';
    inputEl.value = '';
    setTimeout(() => inputEl.focus(), 150);
  }

  function hideModal() {
    if (overlayEl) {
      overlayEl.classList.remove('show');
      inputEl.blur();
    }
  }

  async function submitPassword() {
    const password = inputEl.value;
    if (!password) {
      feedbackEl.className = 'portal-feedback error';
      feedbackEl.innerHTML = 'PLEASE ENTER KEY';
      return;
    }

    feedbackEl.className = 'portal-feedback';
    feedbackEl.innerHTML = 'ESTABLISHING SECURE CONNECTION...';

    try {
      const res = await fetch(`/api/admin/verify?password=${password}`);
      if (res.ok) {
        feedbackEl.className = 'portal-feedback success';
        feedbackEl.innerHTML = 'ACCESS GRANTED. INITIALIZING ROUTE...';
        
        sessionStorage.setItem('admin_auth', password);
        
        setTimeout(() => {
          hideModal();
          window.location.href = 'powers.html';
        }, 800);
      } else {
        throw new Error('Unauthorized');
      }
    } catch (err) {
      feedbackEl.className = 'portal-feedback error';
      feedbackEl.innerHTML = 'AUTHENTICATION FAILED: ACCESS DENIED';
      
      boxEl.classList.add('portal-shake');
      setTimeout(() => boxEl.classList.remove('portal-shake'), 500);
      
      inputEl.value = '';
      inputEl.focus();
    }
  }

  // --- Trigger Listeners ---

  // Trigger 1: 5 clicks on .nav-brand in 3 seconds
  let clickCount = 0;
  let clickTimer = null;

  function handleBrandClick() {
    clickCount++;
    
    if (clickTimer) clearTimeout(clickTimer);
    
    if (clickCount >= 5) {
      clickCount = 0;
      showModal();
    } else {
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 3000); // Reset count after 3 seconds of inactivity
    }
  }

  // Attach brand click listener after DOM load
  function attachBrandTrigger() {
    const brandElement = document.querySelector('.global-navbar .nav-brand');
    if (brandElement) {
      brandElement.style.cursor = 'pointer';
      brandElement.addEventListener('click', handleBrandClick);
    }
  }

  // Trigger 2: Keyboard shortcut Ctrl + Shift + A
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'A') {
      e.preventDefault();
      showModal();
    }
  });

  // Run initial setup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachBrandTrigger);
  } else {
    attachBrandTrigger();
  }
})();

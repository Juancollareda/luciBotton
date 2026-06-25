import { Ranking } from './ranking.js';

let globalMessages = [];
let countryMessages = [];
let activeChannel = 'global'; // 'global' or 'country'
let userCountry = 'XX';
let nickname = '';

// Helper to generate flag emoji from country code
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode === 'XX') return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return countryCode;
  }
}

// Format timestamp to HH:MM
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export const Chat = {
  init() {
    // Load or generate nickname
    nickname = localStorage.getItem('chatNickname');
    if (!nickname) {
      nickname = 'Anon' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('chatNickname', nickname);
    }

    const nickInput = document.getElementById('chatNickname');
    if (nickInput) {
      nickInput.value = nickname;
      nickInput.addEventListener('change', () => {
        let newNick = nickInput.value.trim().substring(0, 15);
        if (!newNick) {
          newNick = 'Anon' + Math.floor(1000 + Math.random() * 9000);
        }
        nickname = newNick;
        nickInput.value = nickname;
        localStorage.setItem('chatNickname', nickname);
      });
    }

    // Set up tabs
    const btnGlobal = document.getElementById('btnGlobalChat');
    const btnCountry = document.getElementById('btnCountryChat');

    if (btnGlobal && btnCountry) {
      btnGlobal.onclick = () => {
        activeChannel = 'global';
        btnGlobal.classList.add('active');
        btnCountry.classList.remove('active');
        this.render();
      };

      btnCountry.onclick = () => {
        activeChannel = 'country';
        btnCountry.classList.add('active');
        btnGlobal.classList.remove('active');
        this.render();
      };
    }

    // Set up send handler
    const sendBtn = document.getElementById('chatSendBtn');
    const chatInput = document.getElementById('chatInput');

    const sendMessage = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      if (text.length > 100) return;

      if (!Ranking.ws || Ranking.ws.readyState !== WebSocket.OPEN) {
        window.showAlert('Connection lost. Reconnecting...', '❌ Chat Offline');
        return;
      }

      Ranking.ws.send(JSON.stringify({
        type: 'chatMessage',
        data: {
          channel: activeChannel,
          text: text,
          nickname: nickname
        }
      }));

      chatInput.value = '';
    };

    if (sendBtn && chatInput) {
      sendBtn.onclick = sendMessage;
      chatInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      };
    }

    // Listen for WebSocket messages
    window.addEventListener('wsMessage', (event) => {
      const data = event.detail;
      if (!data) return;

      if (data.type === 'chatInit') {
        globalMessages = data.data.global || [];
        countryMessages = data.data.country || [];
        userCountry = data.data.userCountry || 'XX';
        
        // Update country tab label with flag & code
        const codeSpan = document.getElementById('userCountryCode');
        if (codeSpan) {
          const emoji = getFlagEmoji(userCountry);
          codeSpan.textContent = `${emoji} ${userCountry}`;
        }
        this.render();
      } else if (data.type === 'chatBroadcast') {
        const msg = data.data;
        if (msg.channel === 'global') {
          globalMessages.push(msg);
          if (globalMessages.length > 30) globalMessages.shift();
        } else {
          countryMessages.push(msg);
          if (countryMessages.length > 30) countryMessages.shift();
        }

        if (msg.channel === activeChannel) {
          this.appendMessage(msg);
        }
      } else if (data.type === 'chatCleared') {
        globalMessages = [];
        countryMessages = [];
        this.render();
      }
    });
  },

  render() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    chatMessages.innerHTML = '';
    const currentList = activeChannel === 'global' ? globalMessages : countryMessages;

    currentList.forEach(msg => {
      this.appendMessage(msg, false); // batch render, scroll at end
    });

    this.scrollToBottom();
  },

  appendMessage(msg, scroll = true) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message';
    if (msg.isAdmin) {
      msgEl.classList.add('admin-message');
    } else if (msg.nickname === nickname && msg.country === userCountry) {
      msgEl.classList.add('my-message');
    }

    const timeStr = formatTime(msg.timestamp);
    const flagStr = getFlagEmoji(msg.country);

    const adminBadge = msg.isAdmin ? `<span class="admin-badge">ADMIN</span>` : '';
    const userClass = msg.isAdmin ? 'chat-user admin-user' : 'chat-user';
    const flagHTML = msg.isAdmin ? '' : `<span class="chat-flag" title="${msg.country}">${flagStr} ${msg.country}</span>`;

    msgEl.innerHTML = `
      <span class="chat-meta">
        <span class="chat-time">[${timeStr}]</span>
        ${flagHTML}
        ${adminBadge}
        <span class="${userClass}">${msg.nickname}:</span>
      </span>
      <span class="chat-text">${msg.text}</span>
    `;

    chatMessages.appendChild(msgEl);

    if (scroll) {
      this.scrollToBottom();
    }
  },

  scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
};

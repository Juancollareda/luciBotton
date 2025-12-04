export const Ranking = {
  ws: null,
  
  getTierInfo(clicks) {
    if (clicks < 1000) return { name: 'Bronze', icon: '🥉', color: '#CD7F32' };
    if (clicks < 10000) return { name: 'Silver', icon: '🥈', color: '#C0C0C0' };
    if (clicks < 100000) return { name: 'Gold', icon: '🥇', color: '#FFD700' };
    return { name: 'Legendary', icon: '💎', color: '#FF1493' };
  },

  init() {
    try {
      // Use secure WebSocket (wss) if the page is loaded over HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.ws = new WebSocket(`${protocol}//${window.location.host}`);
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'rankingUpdate') {
          this.updateTable(data.payload);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed, attempting to reconnect...');
      setTimeout(() => this.init(), 3000);
    };

    // Initial load
    this.update();
  },

  update: () => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        // Convert to old format for compatibility, but with tier info
        const withTiers = data.fullRanking || data;
        Ranking.updateTable(withTiers);
      })
      .catch(() => {
        // Fallback to old endpoint if new one fails
        fetch('/paises')
          .then(res => res.json())
          .then(data => {
            Ranking.updateTable(data);
          })
          .catch(console.error);
      });
  },

  updateTable: (data) => {
    const tbody = document.getElementById('rankingBody');
    tbody.innerHTML = '';
    const topFlag = document.getElementById('topFlag');

    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      const tier = Ranking.getTierInfo(row.clicks);
      
      if (index === 0) {
        const flagUrl = `https://flagcdn.com/256x192/${row.country_code.toLowerCase()}.png`;
        topFlag.innerHTML = `
          <img src="${flagUrl}" alt="${row.country_code}" style="height:96px;margin-right:20px;">
          <div>
            <div>🏆 Top Country</div>
            <div style="font-size:1.2rem; color:${tier.color};">${tier.icon} ${tier.name}</div>
          </div>
        `;
      }
      
      tr.innerHTML = `
        <td style="text-align:center; font-weight:bold;">${index + 1}</td>
        <td style="text-align:center;">${tier.icon} <span style="color:${tier.color};">${tier.name}</span></td>
        <td>${row.country_code}</td>
        <td style="text-align:right; font-weight:bold;">${row.clicks.toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  }
};

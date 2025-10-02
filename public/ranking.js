export const Ranking = {
  ws: null,
  
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
    fetch('/paises')
      .then(res => res.json())
      .then(data => {
        Ranking.updateTable(data);
      })
      .catch(console.error);
  },

  updateTable: (data) => {
    const tbody = document.getElementById('rankingBody');
    tbody.innerHTML = '';
    const topFlag = document.getElementById('topFlag');

    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      if (index === 0) {
        const flagUrl = `https://flagcdn.com/256x192/${row.country_code.toLowerCase()}.png`;
        topFlag.innerHTML = `<img src="${flagUrl}" alt="${row.country_code}" style="height:96px;margin-right:20px;">Top country`;
      }
      tr.innerHTML = `<td>${row.country_code}</td><td>${row.clicks}</td>`;
      tbody.appendChild(tr);
    });
  }
};

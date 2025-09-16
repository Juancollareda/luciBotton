export const Ranking = {
  update: () => {
    fetch('/paises')
      .then(res => res.json())
      .then(data => {
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
      })
      .catch(console.error);
  }
};

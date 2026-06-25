const getIP = require('./getIP');
const geoip = require('geoip-lite');

function getCountry(req) {
  // 1. Check for cookie override (useful for testing on localhost)
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const parts = cookie.split('=');
      const key = parts[0]?.trim();
      const val = parts[1]?.trim();
      if (key && val) acc[key] = val;
      return acc;
    }, {});
    
    if (cookies.country) {
      return cookies.country.toUpperCase();
    }
  }

  // 2. Default GeoIP lookup
  const ip = getIP(req);
  const geo = geoip.lookup(ip);
  return geo ? geo.country : 'XX';
}

module.exports = getCountry;

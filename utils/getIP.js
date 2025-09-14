function getIP(req) {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip.includes(',')) ip = ip.split(',')[0];
  if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
  return ip;
}

module.exports = getIP;

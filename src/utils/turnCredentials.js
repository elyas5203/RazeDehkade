const crypto = require('node:crypto');

function createTurnIceServer(config, identity, nowSeconds = Math.floor(Date.now() / 1000)) {
  const urls = String(config.urls || '').split(',').map(url => url.trim())
    .filter(url => /^turns?:[^\s]+$/i.test(url));
  if (!urls.length) return null;

  if (config.sharedSecret) {
    const requestedTtl = Number.parseInt(config.ttlSeconds, 10);
    const ttl = Number.isFinite(requestedTtl)
      ? Math.max(3600, Math.min(86400, requestedTtl)) : 43200;
    const safeIdentity = String(identity || 'listener').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    const username = `${nowSeconds + ttl}:${safeIdentity}`;
    const credential = crypto.createHmac('sha1', config.sharedSecret)
      .update(username).digest('base64');
    return { urls, username, credential };
  }

  if (config.username && config.credential) {
    return { urls, username: config.username, credential: config.credential };
  }
  return null;
}

module.exports = { createTurnIceServer };

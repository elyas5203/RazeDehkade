/**
 * MohtavaTelBot/index.js
 * فایل اجرایی مستقل بات تلگرام مدیریت محتوای ۵ هفته سناریو
 */

const { runMigrations } = require('../src/db/migrate');
const { MohtavaTelegramBot } = require('./bot');

let botInstance = null;

async function startMohtavaBot(options = {}) {
  if (!botInstance) {
    botInstance = new MohtavaTelegramBot(options);
  } else if (options.io) {
    botInstance.setSocketIO(options.io);
  }
  await botInstance.startPolling();
  return botInstance;
}

if (require.main === module) {
  (async () => {
    try {
      await runMigrations();
      await startMohtavaBot();
    } catch (err) {
      console.error('❌ [MohtavaTelBot] خطا در اجرای بات:', err);
      process.exit(1);
    }
  })();
}

module.exports = { startMohtavaBot, MohtavaTelegramBot };

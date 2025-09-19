const { Telegraf } = require('telegraf');
const { setupHandlers } = require('./handlers');
const { setupWebServer } = require('./server');
const { initializeState } = require('./state');

const BOT_TOKEN = '8262576157:AAFzwnws1IqlSnSCcETCaXyHL57_H5lBsZA';
const bot = new Telegraf(BOT_TOKEN);

// Initialize application
initializeState();
setupHandlers(bot);
setupWebServer(bot);

// Production launch
if (process.env.NODE_ENV === 'production') {
  bot.launch({
    webhook: {
      domain: process.env.RENDER_EXTERNAL_URL,
      port: process.env.PORT || 3000
    }
  });
} else {
  bot.launch();
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

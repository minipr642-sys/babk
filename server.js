const express = require('express');

const setupWebServer = (bot) => {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Webhook configuration
  app.use(express.json());
  app.use(bot.webhookCallback('/'));
  
  app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
  });
};

module.exports = { setupWebServer };

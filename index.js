const express = require('express');
const { startBot } = require('./bot/bot'); // Import the bot starter

const app = express();

app.get('/', (req, res) => {
  res.send('Monetamarkets-Iraq Server is running');
});


// Start the Telegram bots
startBot();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

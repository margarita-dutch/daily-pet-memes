// Load environment variables and validate that everything required is present.
// Throws with a clear message listing what's missing.
require('dotenv').config();

const REQUIRED = ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID', 'CONTENT_API_KEY'];

function loadConfig() {
  const missing = REQUIRED.filter((k) => !process.env[k] || !process.env[k].trim());
  if (missing.length > 0) {
    const msg =
      `Missing required environment variable(s): ${missing.join(', ')}.\n` +
      `Set them in Render's Environment tab (or a local .env file for testing). ` +
      `See .env.example for the full list.`;
    throw new Error(msg);
  }

  return {
    slackBotToken: process.env.SLACK_BOT_TOKEN.trim(),
    slackChannelId: process.env.SLACK_CHANNEL_ID.trim(),
    giphyApiKey: process.env.CONTENT_API_KEY.trim(),
    timezone: (process.env.POST_TIMEZONE || 'America/Los_Angeles').trim(),
    postedStorePath: (process.env.POSTED_STORE_PATH || './data/posted.json').trim(),
    postedHistorySize: Number.parseInt(process.env.POSTED_HISTORY_SIZE || '200', 10) || 200,
  };
}

module.exports = { loadConfig };

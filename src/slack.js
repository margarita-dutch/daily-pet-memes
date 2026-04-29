// Post a single message into a Slack channel using the Web API.
//
// We use chat.postMessage with simple Block Kit so the GIF unfurls inline.
// The bot must be a member of the channel - the README explains how to
// invite it with /invite.

const log = require('./log');

async function postMemeMessage({ token, channelId, caption, imageUrl, altText }) {
  const body = {
    channel: channelId,
    // Plain-text fallback for notifications and clients that don't render blocks.
    text: caption,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: caption },
      },
      {
        type: 'image',
        image_url: imageUrl,
        alt_text: altText || caption,
      },
    ],
  };

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // Slack returns 200 with { ok: false, error: '...' } on app errors,
  // so we always need to inspect the JSON body.
  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error(`Slack returned non-JSON response (status ${res.status})`);
  }

  if (!data.ok) {
    const hint = explainSlackError(data.error);
    throw new Error(`Slack chat.postMessage failed: ${data.error}${hint ? ` (${hint})` : ''}`);
  }

  log.info('Slack post succeeded', { channel: data.channel, ts: data.ts });
  return { channel: data.channel, ts: data.ts };
}

function explainSlackError(code) {
  switch (code) {
    case 'not_in_channel':
      return 'invite the bot to the channel with: /invite @your-bot-name';
    case 'channel_not_found':
      return 'double-check SLACK_CHANNEL_ID; it should look like C0XXXXXXXXX';
    case 'invalid_auth':
    case 'not_authed':
    case 'token_revoked':
      return 'SLACK_BOT_TOKEN is missing/invalid; reinstall the Slack app';
    case 'missing_scope':
      return 'add the chat:write scope to the Slack app and reinstall';
    default:
      return '';
  }
}

module.exports = { postMemeMessage };

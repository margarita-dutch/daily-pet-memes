// Entry point. One execution = one Slack post.
//
//   node src/post.js          -> normal post (used by Render Cron)
//   node src/post.js --test   -> manual test post (clearly labelled in caption)
//
// Exits 0 on success, non-zero on any failure so Render Cron flags the run.

const log = require('./log');
const { loadConfig } = require('./config');
const store = require('./store');
const { fetchRandomPetGif, captionFor } = require('./giphy');
const { postMemeMessage } = require('./slack');

async function main() {
  const isTest = process.argv.includes('--test');
  log.info('Starting daily-pet-memes run', { mode: isTest ? 'test' : 'cron' });

  const cfg = loadConfig();
  log.info('Config loaded', {
    channel: cfg.slackChannelId,
    timezone: cfg.timezone,
    storePath: cfg.postedStorePath,
    historySize: cfg.postedHistorySize,
  });

  // Fetch a GIF, retrying once with the other species if Giphy hiccups.
  let gif;
  try {
    gif = await fetchRandomPetGif({
      apiKey: cfg.giphyApiKey,
      alreadyPosted: (id) => store.has(cfg.postedStorePath, id),
    });
  } catch (err) {
    log.warn('First Giphy attempt failed, retrying once', { error: err.message });
    gif = await fetchRandomPetGif({
      apiKey: cfg.giphyApiKey,
      alreadyPosted: (id) => store.has(cfg.postedStorePath, id),
    });
  }

  log.info('Picked Giphy item', {
    id: gif.id,
    species: gif.species,
    term: gif.term,
    fresh: gif.isFresh,
  });

  let caption = captionFor(gif.species);
  if (isTest) caption = `:test_tube: *Manual test post* — ${caption}`;

  await postMemeMessage({
    token: cfg.slackBotToken,
    channelId: cfg.slackChannelId,
    caption,
    imageUrl: gif.imageUrl,
    altText: `${gif.species} from Giphy: ${gif.title || gif.term}`,
  });

  // Only remember the ID after a successful post so a Slack failure doesn't
  // cause us to skip the GIF on the next run.
  try {
    store.append(cfg.postedStorePath, gif.id, cfg.postedHistorySize);
  } catch (err) {
    log.warn('Could not update posted store (post still succeeded)', {
      error: err.message,
    });
  }

  log.info('Done');
}

main().catch((err) => {
  log.error('Run failed', { error: err.message });
  // A short stack helps in Render logs without being noisy.
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

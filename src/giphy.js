// Fetch a wholesome cat or dog GIF from Giphy.
//
// We keep the search terms short and friendly, force rating=g, and pick
// from a randomized window of results so the channel doesn't see the same
// top-of-search hit every day. The caller is responsible for de-duping
// against history.

const log = require('./log');

const CAT_TERMS = [
  'cute cat',
  'funny cat',
  'happy cat',
  'kitten',
  'cat purr',
  'silly cat',
  'cat zoomies',
];

const DOG_TERMS = [
  'cute dog',
  'funny dog',
  'happy dog',
  'puppy',
  'dog tail wag',
  'silly dog',
  'dog zoomies',
];

const CAT_EMOJI = ['🐱', '🐈', '😺', '😻', '🙀', '🐾'];
const DOG_EMOJI = ['🐶', '🐕', '🐾', '🦴'];

const CAT_CAPTIONS = [
  'A little catspiration for your day',
  'Reporting for cuddle duty',
  'Daily dose of feline charm',
  'Whiskers, but make it wholesome',
  'This cat says hi',
];

const DOG_CAPTIONS = [
  'A little dogspiration for your day',
  'Tail wags incoming',
  'Daily dose of doggo joy',
  'Good boy/girl alert',
  'This pup says hi',
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchJson(url) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Giphy responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Pull a single Giphy item. species is "cat" or "dog".
// alreadyPosted: function(id) -> bool, used to skip recently posted IDs.
async function fetchPetGif({ apiKey, species, alreadyPosted }) {
  const terms = species === 'cat' ? CAT_TERMS : DOG_TERMS;
  const term = pickRandom(terms);

  const params = new URLSearchParams({
    api_key: apiKey,
    q: term,
    limit: '25',
    rating: 'g',
    lang: 'en',
    bundle: 'messaging_non_clips',
  });
  const url = `https://api.giphy.com/v1/gifs/search?${params.toString()}`;

  log.info('Searching Giphy', { species, term });
  const data = await fetchJson(url);

  if (!Array.isArray(data.data) || data.data.length === 0) {
    throw new Error(`Giphy returned no results for term "${term}"`);
  }

  // Shuffle so we don't always grab the top hit.
  const shuffled = [...data.data].sort(() => Math.random() - 0.5);

  // Pick the first item we haven't posted recently, otherwise fall back to
  // the first result so we still post something.
  const fresh = shuffled.find((item) => item && item.id && !alreadyPosted(item.id));
  const chosen = fresh || shuffled[0];

  if (!chosen || !chosen.id) {
    throw new Error('Giphy returned items but none had a usable id');
  }

  // Prefer a real image URL Slack can unfurl/inline. Fall back through a few
  // image variants Giphy returns.
  const images = chosen.images || {};
  const imageUrl =
    (images.original && images.original.url) ||
    (images.downsized_large && images.downsized_large.url) ||
    (images.fixed_height && images.fixed_height.url) ||
    chosen.url;

  if (!imageUrl) {
    throw new Error('Giphy item missing an image URL');
  }

  return {
    id: chosen.id,
    species,
    term,
    imageUrl,
    pageUrl: chosen.url || `https://giphy.com/gifs/${chosen.id}`,
    title: (chosen.title || '').trim(),
    isFresh: Boolean(fresh),
  };
}

// Pick cat or dog at random, then fetch.
async function fetchRandomPetGif({ apiKey, alreadyPosted }) {
  const species = Math.random() < 0.5 ? 'cat' : 'dog';
  return fetchPetGif({ apiKey, species, alreadyPosted });
}

function captionFor(species) {
  const caption = species === 'cat' ? pickRandom(CAT_CAPTIONS) : pickRandom(DOG_CAPTIONS);
  const emoji = species === 'cat' ? pickRandom(CAT_EMOJI) : pickRandom(DOG_EMOJI);
  return `${emoji} ${caption}`;
}

module.exports = { fetchPetGif, fetchRandomPetGif, captionFor };

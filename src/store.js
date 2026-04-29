// Lightweight duplicate-prevention store.
//
// We track the last N Giphy IDs we've posted in a small JSON file. Before
// posting, we ask "is this ID in the recent list?" and skip it if so. After
// a successful post, we append the ID and trim the history.
//
// On Render, point POSTED_STORE_PATH at a file on a Persistent Disk
// (e.g. /var/data/posted.json) so memory survives restarts. Without a disk,
// the file resets between deploys, which is acceptable for an MVP.

const fs = require('fs');
const path = require('path');
const log = require('./log');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Be tolerant of older entries that may have been objects.
    return parsed.map((x) => (typeof x === 'string' ? x : x && x.id)).filter(Boolean);
  } catch (err) {
    log.warn('Could not read posted store, starting fresh', { error: err.message });
    return [];
  }
}

function save(filePath, ids) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(ids, null, 2));
}

function has(filePath, id) {
  return load(filePath).includes(id);
}

function append(filePath, id, maxSize) {
  const ids = load(filePath);
  ids.push(id);
  // Keep only the most recent maxSize entries.
  const trimmed = ids.slice(-maxSize);
  save(filePath, trimmed);
}

module.exports = { has, append, load };

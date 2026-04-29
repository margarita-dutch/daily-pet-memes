# daily-pet-memes

A small internal Slack bot for [Dutch.com](https://dutch.com) that posts a
funny, wholesome cat or dog GIF into the `#daily-pet-memes` Slack channel
twice per workday. Pets first. Always.

## How this is different from `#dutch-pets`

Dutch already has a wonderful `#dutch-pets` channel where employees share
photos of their *own* cats and dogs. This bot does **not** replace or
compete with that channel — `#dutch-pets` is the human, personal one and
should stay that way.

`#daily-pet-memes` is the *automated* counterpart:

|                       | `#dutch-pets`                          | `#daily-pet-memes`                          |
| --------------------- | -------------------------------------- | ------------------------------------------- |
| Who posts             | Real Dutch employees                   | The bot, automatically                      |
| What gets posted      | Photos of employees' actual pets       | Curated cat/dog meme GIFs from Giphy        |
| Cadence               | Whenever someone feels like sharing    | Twice a workday, on schedule                |
| Vibe                  | Personal, real-life, "meet my dog"     | Lighthearted, meme-y, "here's a smile"      |

Think of `#dutch-pets` as the family photo album and `#daily-pet-memes`
as the joke-of-the-day calendar on the breakroom wall. Both wholesome,
both pet-themed, doing different jobs.

## What this project does

Each time the app runs, it:

1. Picks **cat** or **dog** at random.
2. Searches Giphy for a wholesome term (e.g. "cute dog", "kitten", "happy
   cat") with rating forced to `g`.
3. Skips any GIF whose Giphy ID we've already posted recently
   (duplicate prevention).
4. Posts **one** Slack message into `#daily-pet-memes` containing the GIF
   plus a short friendly caption with an emoji.
5. Remembers the GIF ID so we don't repost it next time.
6. Exits 0 on success, non-zero on any failure.

One execution = one Slack post. There is no internal scheduler.
[Render Cron Jobs](https://render.com/docs/cronjobs) drive the timing
(one morning run, one afternoon run).

## How the Slack bot works

It's a stateless script (`src/post.js`) that reads its config from
environment variables and uses the Slack Web API
(`chat.postMessage`) to post the message. Because it's stateless, the
exact same code runs locally (for the manual test) and on Render
(for scheduled posts).

The post itself uses Slack Block Kit so the GIF unfurls inline:

- a section block with the caption and emoji
- an image block pointing at the Giphy GIF URL

## Project layout

```
.
├── README.md
├── package.json
├── render.yaml              # Render blueprint with two cron jobs
├── .env.example             # Copy to .env for local testing
├── .gitignore
├── scripts/
│   └── post_test.sh         # Convenience wrapper for the manual test
└── src/
    ├── post.js              # Entry point (one run = one post)
    ├── config.js            # Loads + validates environment variables
    ├── giphy.js             # Search Giphy, pick a wholesome cat/dog GIF
    ├── slack.js             # chat.postMessage wrapper with friendly errors
    ├── store.js             # Tiny JSON-file dedupe store
    └── log.js               # Lightweight structured logger
```

## How to create / configure the Slack app

1. Go to <https://api.slack.com/apps> and click **Create New App** →
   **From scratch**.
2. Name it something like `Daily Pet Memes` and pick the Dutch workspace.
3. In the left nav, open **OAuth & Permissions**.
4. Under **Scopes → Bot Token Scopes**, add:
   - `chat:write` — required to post the message
   - `chat:write.public` *(optional)* — lets the bot post in public
     channels it hasn't been invited to. Skip this if you want to be
     explicit and rely on `/invite`.
5. Scroll up and click **Install to Workspace**, then approve the install.
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`). This is your
   `SLACK_BOT_TOKEN`.
7. *(Optional but recommended)* Under **App Home**, give the bot a friendly
   display name (e.g. `pet-memes-bot`) and a pet-themed icon.

### Required Slack scopes

| Scope               | Required | Why                                   |
| ------------------- | -------- | ------------------------------------- |
| `chat:write`        | Yes      | Post messages as the bot              |
| `chat:write.public` | Optional | Post in channels without `/invite`    |

### Invite the bot to `#daily-pet-memes`

In Slack:

```
/invite @pet-memes-bot
```

(Replace `pet-memes-bot` with whatever display name you set.) If the bot
isn't a member of the channel and you didn't add `chat:write.public`,
Slack will return `not_in_channel` and the run will fail with a clear
message.

### Find the Slack channel ID

1. In Slack, open `#daily-pet-memes`.
2. Click the channel name at the top.
3. Scroll to the bottom of the **About** tab.
4. Copy the **Channel ID** (looks like `C0XXXXXXXXX`). That's your
   `SLACK_CHANNEL_ID`.

## How to create a Giphy API key

1. Go to <https://developers.giphy.com/dashboard/>.
2. Sign in / create a Giphy account.
3. Click **Create an App** → choose **API** (not SDK) → fill out the form.
4. Copy the generated API key. That's your `CONTENT_API_KEY`.

The MVP uses Giphy's public Search endpoint with `rating=g` enforced in
code.

## Required environment variables

See [`.env.example`](./.env.example) for the canonical list.

| Variable              | Required | Notes                                                                                  |
| --------------------- | -------- | -------------------------------------------------------------------------------------- |
| `SLACK_BOT_TOKEN`     | Yes      | Slack Bot User OAuth Token, starts with `xoxb-`                                        |
| `SLACK_CHANNEL_ID`    | Yes      | The channel ID for `#daily-pet-memes`, e.g. `C0XXXXXXXXX`                              |
| `CONTENT_API_KEY`     | Yes      | Giphy API key                                                                          |
| `POST_TIMEZONE`       | No       | Human-readable label for logs. Defaults to `America/Los_Angeles`                       |
| `POSTED_STORE_PATH`   | No       | Where to keep the dedupe JSON. Defaults to `./data/posted.json` locally; on Render set to `/var/data/posted.json` if you attach a Persistent Disk |
| `POSTED_HISTORY_SIZE` | No       | How many recent GIF IDs to remember. Defaults to `200`                                 |

> Never commit real secrets. `.env` is gitignored. Real values live in
> Render's Environment tab (and optionally a local `.env` for testing).

## How to run locally

Requires Node.js 18+ (uses the global `fetch`).

```bash
# 1. Clone
git clone https://github.com/margarita-dutch/daily-pet-memes.git
cd daily-pet-memes

# 2. Install deps
npm install

# 3. Configure
cp .env.example .env
# Then edit .env and fill in real values for SLACK_BOT_TOKEN,
# SLACK_CHANNEL_ID, and CONTENT_API_KEY.

# 4. Run a normal post
npm run post
```

## How to manually test one post

There is a dedicated test command that posts exactly one message into
`#daily-pet-memes` with a `Manual test post` prefix in the caption so
the team can tell it apart from the scheduled posts.

```bash
npm run post:test
```

Equivalent forms:

```bash
node src/post.js --test
./scripts/post_test.sh
```

You should see logs like:

```
[2026-04-29T16:00:00.000Z] INFO Starting daily-pet-memes run {"mode":"test"}
[2026-04-29T16:00:00.001Z] INFO Searching Giphy {"species":"dog","term":"happy dog"}
[2026-04-29T16:00:00.500Z] INFO Picked Giphy item {"id":"abc123","species":"dog","term":"happy dog","fresh":true}
[2026-04-29T16:00:01.000Z] INFO Slack post succeeded {"channel":"C0XXXXXXXXX","ts":"1714411201.000100"}
[2026-04-29T16:00:01.001Z] INFO Done
```

## How to deploy on Render

You have two options. Either works.

### Option A — Use the included `render.yaml` blueprint (fastest)

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. In Render: **New** → **Blueprint** → connect this repo → **Apply**.
3. Render reads `render.yaml` and creates **two cron jobs**:
   - `daily-pet-memes-morning`   (`0 16 * * *` UTC ≈ 09:00 Pacific)
   - `daily-pet-memes-afternoon` (`0 22 * * *` UTC ≈ 15:00 Pacific)
4. Open each cron job → **Environment** → set the three secrets:
   - `SLACK_BOT_TOKEN`
   - `SLACK_CHANNEL_ID`
   - `CONTENT_API_KEY`
5. (Optional) If you want dedupe memory to survive across runs, attach a
   small Persistent Disk to each cron job, mount it at `/var/data`, and
   keep the default `POSTED_STORE_PATH=/var/data/posted.json`.
6. Click **Trigger Run** on either cron job to verify it posts.

### Option B — Configure the cron jobs by hand

1. Push this repo to GitHub.
2. In Render: **New** → **Cron Job** → connect the repo.
3. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Command:** `npm run post`
   - **Schedule:** see below
4. Add the same environment variables.
5. Repeat to create a second cron job with the afternoon schedule.

### Configure two Render Cron Jobs (twice-daily)

Render schedules use **UTC**. Pre-converted from America/Los_Angeles
during **Pacific Daylight Time** (UTC-7):

| Job                          | Local time (PT) | Cron (UTC)    |
| ---------------------------- | --------------- | ------------- |
| `daily-pet-memes-morning`    | 09:00           | `0 16 * * *`  |
| `daily-pet-memes-afternoon`  | 15:00           | `0 22 * * *`  |

If you'd rather have different local times (e.g. 10:00 and 14:00), just
add 7 to the local hour to get the UTC hour during PDT.

#### Daylight Saving Time

During **Pacific Standard Time** (roughly Nov–Mar, UTC-8), those same
UTC schedules fire one hour later in local time (10:00 / 16:00 PT). If
you need exact local times year-round, edit the cron strings in the
Render UI when DST flips, or run two extra cron jobs and disable the
ones that don't apply.

## How duplicate prevention works

Before posting, we look up the chosen Giphy item's `id` in a small JSON
file (`POSTED_STORE_PATH`, default `./data/posted.json`). If the ID is
already in the file, we pick a different result from the same search
batch. After a successful Slack post, we append the ID to the file and
trim the history to the last `POSTED_HISTORY_SIZE` entries (default
200, so roughly 100 days of posts).

This is intentionally lightweight - perfect for an MVP - and has two
implications you should know about:

- **In a stateless cron environment, the file resets between deploys.**
  That's fine for an MVP - the channel will rarely see a repeat from
  before the last deploy.
- **If you want memory that survives restarts and deploys**, attach a
  Render [Persistent Disk](https://render.com/docs/disks) to each cron
  job (1 GB is plenty), mount it at `/var/data`, and set
  `POSTED_STORE_PATH=/var/data/posted.json`. Both cron jobs should point
  at the same disk path so they share history.

If you outgrow this, swap `src/store.js` for any tiny key-value store
(Redis, Postgres, Render KV) - the rest of the code doesn't care.

## Troubleshooting

### `Missing required environment variable(s): ...`

The script refuses to run if any of the three required env vars are
empty. Set them in Render's Environment tab (or your local `.env`) and
re-run.

### Slack: `not_in_channel`

The bot isn't a member of `#daily-pet-memes`. In Slack, run:

```
/invite @pet-memes-bot
```

…or add the `chat:write.public` scope to the Slack app and reinstall it.

### Slack: `channel_not_found`

`SLACK_CHANNEL_ID` is wrong. Make sure you copied the channel ID (looks
like `C0XXXXXXXXX`), not the channel name. See "Find the Slack channel
ID" above.

### Slack: `invalid_auth` / `not_authed` / `token_revoked`

`SLACK_BOT_TOKEN` is missing or invalid. Reinstall the Slack app and
update the env var.

### Slack: `missing_scope`

The Slack app is missing `chat:write`. Add it under **OAuth &
Permissions → Bot Token Scopes** and reinstall the app.

### Giphy returned no results

Giphy is rate-limiting or your API key is wrong. The script retries once
with a different search term automatically. If it still fails, check the
Giphy dashboard for your key and quota.

### The same GIF keeps showing up

Either the dedupe file is being reset between runs (you're not using a
Persistent Disk on Render - see "How duplicate prevention works"), or
the search term is too narrow. The default term list already mixes
several wholesome queries; you can edit `CAT_TERMS` / `DOG_TERMS` in
`src/giphy.js` to taste.

### My local test run posted to Slack but the cron run didn't

Check the cron job's logs in Render. The script always prints an
`ERROR Run failed` line with the underlying error message before
exiting non-zero, and Render will surface that in the run history.

## License

Internal Dutch.com tool. Have fun, be kind, post pets.

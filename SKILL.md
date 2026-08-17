---
name: facebook-reels-extractor
description: Use when an agent must collect public Facebook Page or profile Reel IDs, grid views, likes, comments, shares, titles, durations, or publication dates through an authorized Chrome Relay session.
---

# Facebook Reels Extractor

Use a two-stage, ID-correlated collection. The profile grid is authoritative for displayed views; universal Reel pages enrich each discovered ID.

## Preconditions

- Use the connected Chrome Relay tab only. Do not request credentials, inspect cookies, or bypass login, challenges, CAPTCHA, rate limits, or access controls.
- Collect only public, authorized profiles or Pages.
- Create a run folder and save `raw-run.json` plus `normalized-run.json`.

## Stage 1: discover the grid

1. Navigate to `<profile-url>/reels_tab`.
2. Wait 5,000 ms after the initial navigation before evaluating the first grid.
3. Follow the Stage 1 capture contract in `{baseDir}/references/browser-evaluators.md`, using `{baseDir}/scripts/facebook-stage-one.mjs` for every scroll.
4. After each scroll, wait the full 5,000 ms before reading cards. Do not scroll again, switch accounts, or mark the profile complete during that wait.
5. Stop only after three consecutive scrolls, each followed by the full wait, add no IDs. Loading placeholders are not evidence that the inventory is complete.
6. Preserve `views_display` exactly. Never turn `2.5K` into an exact view count.

## Stage 2: enrich every ID

1. Reuse one tab and navigate to `https://www.facebook.com/reels/<video_id>` for every Stage 1 ID.
2. Follow the Stage 2 capture contract in `{baseDir}/references/browser-evaluators.md`.
3. Correlate JSON and visible controls to the requested `video_id`.
4. Keep only active controls with `tabindex="0"`; neighboring preloaded cards are not the current Reel.
5. Save one detail object per requested ID, including warnings for unavailable or blocked data.

## Normalize and report

Run:

```bash
node {baseDir}/scripts/normalize-reels.mjs --input raw-run.json --output normalized-run.json
```

Report the normalized summary, elapsed collection time, and each `partial` record. Unavailable metrics are `null`/`Not available`, never invented as zero. Facebook's visible Share value is `shares`; set `sends` to `null` unless Facebook separately exposes sends.

## Stop conditions

Report `blocked` for a login wall, challenge, CAPTCHA, or rate limit. Report `partial` when the page cannot be correlated to the requested ID. Do not retry by changing identities, proxies, or browser profiles.

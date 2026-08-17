# Browser capture contract

Collect two arrays in the active Facebook tab and save them in one raw-run JSON object before normalizing.

## Stage 1: profile grid

Navigate to `<profile-url>/reels_tab`, then wait 5,000 ms before the first evaluation. Facebook renders Reel cards more slowly than the other supported platforms.

For every subsequent scroll, use the mandatory timing wrapper below. It must complete the scroll, wait 5,000 ms, and only then evaluate the grid. Do not replace the wait with a shorter delay or issue another scroll while it is pending:

```js
import { scrollAndCaptureFacebookGrid } from '{baseDir}/scripts/facebook-stage-one.mjs';

const rows = await scrollAndCaptureFacebookGrid({
  scroll: () => tab.dom_cua.scroll({ x: 700, y: 900 }),
  wait: (milliseconds) => tab.playwright.waitForTimeout(milliseconds),
  capture: () => tab.playwright.evaluate(gridEvaluator),
});
```

Use the following `gridEvaluator` for `capture`:

```js
() => {
  const seen = new Set();
  return [...document.querySelectorAll('a[aria-label="Reel tile preview"][href*="/reel/"]')]
    .map((a, index) => {
      const href = a.getAttribute('href') || '';
      const videoId = (href.match(/\/reel\/(\d+)/) || [])[1];
      return { position: index + 1, video_id: videoId || null, profile_reel_url: new URL(href, location.origin).href, views_display: (a.textContent || '').trim() || null };
    })
    .filter((item) => item.video_id && !seen.has(item.video_id) && (seen.add(item.video_id), true));
}
```

Merge returned rows by `video_id`; stop after three consecutive *post-wait* scrolls add no IDs. If Facebook still shows loading placeholders, complete the current 5,000 ms wait and capture again before deciding that no new IDs were added. Never switch to the next account before this stop condition is satisfied.

## Stage 2: universal Reel page

For every ID navigate to `https://www.facebook.com/reels/<video_id>`. Preserve its redirected URL as `final_url`. Read likes only from `[aria-label="Like"][role="button"][tabindex="0"]`; `tabindex="-1"` belongs to preloaded neighboring Reels.

Evaluate this function with the requested ID. It parses application/json scripts and uses a story only when `JSON.parse(story.tracking).video_id` equals that ID:

```js
(target) => {
  const active = (label) => [...document.querySelectorAll(`[aria-label="${label}"][role="button"][tabindex="0"]`)]
    .map((node) => (node.innerText || '').trim()).find(Boolean) || null;
  const out = { video_id: target, final_url: location.href, likes_display: active('Like'), comments_exact: null, shares_exact: null, title: null, duration_seconds: null, published_at_unix: null, profile_id: null, post_id: null, warnings: [] };
  const candidates = [];
  const walk = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 18) return;
    if (!Array.isArray(value) && typeof value.tracking === 'string' && Array.isArray(value.attachments)) {
      try { const tracking = JSON.parse(value.tracking); if (tracking.video_id === target) candidates.push({ story: value, tracking }); } catch {}
    }
    Array.isArray(value) ? value.forEach((item) => walk(item, depth + 1)) : Object.values(value).forEach((item) => walk(item, depth + 1));
  };
  for (const script of document.querySelectorAll('script[type="application/json"]')) { try { walk(JSON.parse(script.textContent || '')); } catch {} }
  for (const { story, tracking } of candidates) {
    const media = story.attachments?.[0]?.media || {}, feedback = story.feedback || {};
    out.title ??= story.message?.text ?? null;
    out.duration_seconds ??= Number.isFinite(media.length_in_second) ? media.length_in_second : null;
    out.post_id ??= story.post_id ?? null;
    out.profile_id ??= tracking.content_owner_id_new ?? null;
    out.published_at_unix ??= tracking.page_insights?.[tracking.content_owner_id_new]?.post_context?.publish_time ?? null;
    if (Number.isInteger(feedback.total_comment_count)) out.comments_exact = feedback.total_comment_count;
    if (/^\d+$/.test(String(feedback.share_count_reduced ?? ''))) out.shares_exact = Number(feedback.share_count_reduced);
  }
  if (!candidates.length) out.warnings.push('no_matching_embedded_story');
  return out;
}
```

The matching story provides these values:

```text
comments_exact      feedback.total_comment_count
shares_exact        feedback.share_count_reduced
title               message.text
duration_seconds    attachments[0].media.length_in_second
published_at_unix   tracking.page_insights[content_owner_id_new].post_context.publish_time
profile_id          tracking.content_owner_id_new
post_id             story.post_id
```

Absent metrics are null. Do not infer zero from a missing control.

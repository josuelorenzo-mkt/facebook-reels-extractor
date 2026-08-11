import fs from 'node:fs';

const FIELD_SOURCES = {
  views: 'profile-grid.visible-text',
  likes: 'reel-page.active-like-control',
  comments: 'reel-page.embedded-json.feedback.total_comment_count',
  shares: 'reel-page.embedded-json.feedback.share_count_reduced',
  title: 'reel-page.embedded-json.story.message.text',
  duration_seconds: 'reel-page.embedded-json.attachments[0].media.length_in_second',
  published_at: 'reel-page.embedded-json.tracking.page_insights.*.post_context.publish_time',
};

function exactInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  return null;
}

function requiredArray(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}

export function normalizeRun(input) {
  const grid = requiredArray(input.grid, 'grid');
  const details = requiredArray(input.details, 'details');
  const detailById = new Map(details.map((detail) => [String(detail.video_id), detail]));
  const seen = new Set();
  const records = grid.map((card) => {
    const videoId = String(card.video_id || '');
    if (!videoId) throw new Error('grid card missing video_id');
    if (seen.has(videoId)) throw new Error(`duplicate video_id: ${videoId}`);
    seen.add(videoId);
    const detail = detailById.get(videoId) || {};
    const warnings = [...(detail.warnings || [])];
    if (!detailById.has(videoId)) warnings.push('detail_not_collected');
    const likes = exactInteger(detail.likes_display);
    const comments = exactInteger(detail.comments_exact);
    const shares = exactInteger(detail.shares_exact);
    const publishedAt = Number.isFinite(detail.published_at_unix) ? new Date(detail.published_at_unix * 1000).toISOString() : null;
    const complete = detailById.has(videoId) && detail.title != null && Number.isFinite(detail.duration_seconds) && publishedAt != null && comments != null && shares != null && warnings.length === 0;
    return {
      position: card.position ?? null, video_id: videoId, profile_id: detail.profile_id ?? null, post_id: detail.post_id ?? null,
      profile_reel_url: card.profile_reel_url ?? null, canonical_url: detail.final_url ?? null,
      views: null, views_display: card.views_display ?? null, likes, likes_display: detail.likes_display ?? null,
      comments, shares, sends: null, title: detail.title ?? null,
      duration_seconds: Number.isFinite(detail.duration_seconds) ? detail.duration_seconds : null,
      published_at: publishedAt, observed_at: input.observed_at ?? null, status: complete ? 'success' : 'partial',
      field_sources: FIELD_SOURCES, ...(warnings.length ? { warnings } : {}),
    };
  });
  return {
    extractor: 'facebook-reels-extractor', extractor_version: '0.1.0', profile_url: input.profile_url ?? null,
    observed_at: input.observed_at ?? null,
    summary: { reels_discovered: grid.length, reels_normalized: records.length, successful: records.filter((r) => r.status === 'success').length, partial: records.filter((r) => r.status === 'partial').length },
    records,
  };
}

function argument(name) { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1] || null; }

if (import.meta.main) {
  const inputPath = argument('--input'); const outputPath = argument('--output');
  if (!inputPath || !outputPath) { console.error('Usage: node normalize-reels.mjs --input raw-run.json --output normalized-run.json'); process.exitCode = 2; }
  else { const result = normalizeRun(JSON.parse(fs.readFileSync(inputPath, 'utf8'))); fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result.summary)); }
}

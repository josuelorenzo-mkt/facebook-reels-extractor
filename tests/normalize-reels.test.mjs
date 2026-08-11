import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeRun } from '../scripts/normalize-reels.mjs';

test('joins stage-one views with matching stage-two metrics without inventing precision', () => {
  const result = normalizeRun({
    profile_url: 'https://www.facebook.com/wealthauramedia/reels_tab',
    observed_at: '2026-08-11T00:00:00.000Z',
    grid: [
      { position: 1, video_id: '1343892948799051', profile_reel_url: 'https://www.facebook.com/reel/1343892948799051/', views_display: '2.5K' },
    ],
    details: [
      {
        video_id: '1343892948799051',
        final_url: 'https://www.facebook.com/reel/1343892948799051',
        profile_id: '61591577152724',
        post_id: '122119636593385905',
        likes_display: '52',
        comments_exact: 0,
        shares_exact: 2,
        title: 'Building wealth starts with changing how you think about money.',
        duration_seconds: 18.5,
        published_at_unix: 1786370145,
      },
    ],
  });

  assert.deepEqual(result.records, [{
    position: 1,
    video_id: '1343892948799051',
    profile_id: '61591577152724',
    post_id: '122119636593385905',
    profile_reel_url: 'https://www.facebook.com/reel/1343892948799051/',
    canonical_url: 'https://www.facebook.com/reel/1343892948799051',
    views: null,
    views_display: '2.5K',
    likes: 52,
    likes_display: '52',
    comments: 0,
    shares: 2,
    sends: null,
    title: 'Building wealth starts with changing how you think about money.',
    duration_seconds: 18.5,
    published_at: '2026-08-10T13:55:45.000Z',
    observed_at: '2026-08-11T00:00:00.000Z',
    status: 'success',
    field_sources: {
      views: 'profile-grid.visible-text',
      likes: 'reel-page.active-like-control',
      comments: 'reel-page.embedded-json.feedback.total_comment_count',
      shares: 'reel-page.embedded-json.feedback.share_count_reduced',
      title: 'reel-page.embedded-json.story.message.text',
      duration_seconds: 'reel-page.embedded-json.attachments[0].media.length_in_second',
      published_at: 'reel-page.embedded-json.tracking.page_insights.*.post_context.publish_time',
    },
  }]);
});

test('marks missing detail fields partial and never turns them into zero', () => {
  const result = normalizeRun({
    profile_url: 'https://www.facebook.com/example/reels_tab',
    observed_at: '2026-08-11T00:00:00.000Z',
    grid: [{ position: 1, video_id: '99', profile_reel_url: 'https://www.facebook.com/reel/99/', views_display: '202' }],
    details: [{ video_id: '99', final_url: 'https://www.facebook.com/reel/99', warnings: ['no_matching_embedded_story'] }],
  });

  assert.equal(result.records[0].comments, null);
  assert.equal(result.records[0].shares, null);
  assert.equal(result.records[0].likes, null);
  assert.equal(result.records[0].status, 'partial');
  assert.deepEqual(result.records[0].warnings, ['no_matching_embedded_story']);
});

test('rejects duplicate grid IDs before an agent can report an inflated inventory', () => {
  assert.throws(() => normalizeRun({
    profile_url: 'https://www.facebook.com/example/reels_tab',
    observed_at: '2026-08-11T00:00:00.000Z',
    grid: [
      { position: 1, video_id: '99', views_display: '1' },
      { position: 2, video_id: '99', views_display: '1' },
    ],
    details: [],
  }), /duplicate video_id: 99/);
});

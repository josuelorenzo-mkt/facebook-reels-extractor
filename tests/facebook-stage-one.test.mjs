import assert from 'node:assert/strict';
import test from 'node:test';

import { FACEBOOK_STAGE_ONE_SCROLL_WAIT_MS, scrollAndCaptureFacebookGrid } from '../scripts/facebook-stage-one.mjs';

test('waits five seconds after every Facebook grid scroll before capturing cards', async () => {
  const events = [];
  const result = await scrollAndCaptureFacebookGrid({
    scroll: async () => events.push('scroll'),
    wait: async (milliseconds) => events.push(`wait:${milliseconds}`),
    capture: async () => {
      events.push('capture');
      return ['captured'];
    },
  });

  assert.equal(FACEBOOK_STAGE_ONE_SCROLL_WAIT_MS, 5000);
  assert.deepEqual(events, ['scroll', 'wait:5000', 'capture']);
  assert.deepEqual(result, ['captured']);
});

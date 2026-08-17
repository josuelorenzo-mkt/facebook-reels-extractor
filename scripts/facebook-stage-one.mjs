export const FACEBOOK_STAGE_ONE_SCROLL_WAIT_MS = 5000;

export async function scrollAndCaptureFacebookGrid({ scroll, wait, capture }) {
  if (typeof scroll !== 'function' || typeof wait !== 'function' || typeof capture !== 'function') {
    throw new TypeError('scroll, wait, and capture callbacks are required');
  }

  await scroll();
  await wait(FACEBOOK_STAGE_ONE_SCROLL_WAIT_MS);
  return capture();
}

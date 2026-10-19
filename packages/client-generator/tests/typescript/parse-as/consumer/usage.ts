import { getGiftcardsCardId } from './client.js';

export async function streamUsage() {
  return getGiftcardsCardId({ path: { cardId: 'gc_1' } }, { parseAs: 'stream' });
}

export async function textUsage() {
  return getGiftcardsCardId({ path: { cardId: 'gc_1' } }, { parseAs: 'text' });
}

// @ts-expect-error — parseAs is a closed union; bogus kinds are rejected.
export const bogus = getGiftcardsCardId({ path: { cardId: 'gc_1' } }, { parseAs: 'xml' });

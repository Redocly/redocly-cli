import { describe, expect, it } from 'vitest';

import { mapLimit } from '../files.js';

describe('mapLimit', () => {
  it('preserves result order regardless of completion order', async () => {
    const items = [30, 10, 20, 5, 15];
    const results = await mapLimit(items, 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms;
    });
    expect(results).toEqual(items);
  });

  it('never runs more than `limit` callbacks concurrently', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    let inFlight = 0;
    let maxInFlight = 0;

    await mapLimit(items, 3, async (i) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return i;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(maxInFlight).toBeGreaterThan(1); // sanity: concurrency actually happened
  });

  it('passes through results and the original index', async () => {
    const items = ['a', 'b', 'c'];
    const results = await mapLimit(items, 16, async (item, index) => `${item}-${index}`);
    expect(results).toEqual(['a-0', 'b-1', 'c-2']);
  });

  it('handles an empty array', async () => {
    const results = await mapLimit([], 16, async (item) => item);
    expect(results).toEqual([]);
  });
});

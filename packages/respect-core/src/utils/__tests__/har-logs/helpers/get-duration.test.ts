import { getDuration } from '../../../har-logs/helpers/get-duration';

describe('getDuration', () => {
  it('should return the duration in milliseconds', () => {
    const result = getDuration([1, 0], [2, 0]);
    expect(result).toBe(1000);
  });

  it('should return -1000 if duration is negative', () => {
    const result = getDuration([2, 0], [1, 0]);
    expect(result).toBe(-1000);
  });
});

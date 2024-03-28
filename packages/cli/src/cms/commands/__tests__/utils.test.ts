import { retryUntilConditionMet } from '../utils';

describe('retryUntilConditionMet()', () => {
  it('should retry until condition meet and return result', async () => {
    const operation = jest
      .fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'done' });

    const data = await retryUntilConditionMet({
      operation,
      condition: (result: any) => result?.status === 'done',
      retryIntervalMs: 100,
      retryTimeoutMs: 1000,
    });

    expect(data).toEqual({ status: 'done' });
  });

  it('should throw error if condition not meet for desired timeout', async () => {
    const operation = jest.fn().mockResolvedValue({ status: 'pending' });

    let caughtError;
    try {
      await retryUntilConditionMet({
        operation,
        condition: (result: any) => result?.status === 'done',
        retryIntervalMs: 100,
        retryTimeoutMs: 1000,
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError.message).toEqual('Timeout exceeded');
  });
});

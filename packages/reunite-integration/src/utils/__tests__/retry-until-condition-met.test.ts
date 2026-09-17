import { retryUntilConditionMet } from '../retry-until-condition-met.js';

describe('retryUntilConditionMet()', () => {
  it('retries until the condition is met and returns the result', async () => {
    const operation = vi
      .fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'done' });

    const data = await retryUntilConditionMet({
      operation,
      condition: (result: any) => result?.status === 'done',
      retryIntervalMs: 10,
      retryTimeoutMs: 1000,
    });

    expect(data).toEqual({ status: 'done' });
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('fails when the condition is not met within the timeout', async () => {
    const operation = vi.fn().mockResolvedValue({ status: 'pending' });

    await expect(
      retryUntilConditionMet({
        operation,
        condition: (result: any) => result?.status === 'done',
        retryIntervalMs: 10,
        retryTimeoutMs: 50,
      })
    ).rejects.toThrow('Timeout exceeded.');
  });

  it('awaits "onConditionNotMet" before every retry', async () => {
    const operation = vi
      .fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'done' });
    const onConditionNotMet = vi.fn().mockResolvedValue(undefined);

    await retryUntilConditionMet({
      operation,
      condition: (result: any) => result?.status === 'done',
      retryIntervalMs: 10,
      retryTimeoutMs: 1000,
      onConditionNotMet,
    });

    expect(onConditionNotMet).toHaveBeenCalledTimes(2);
    expect(onConditionNotMet).toHaveBeenNthCalledWith(1, { status: 'pending' });
  });
});

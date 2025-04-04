import { logger } from '../logger.js';

describe('output', () => {
  it('should write all parsable data to stdout', () => {
    const spyingStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const data = '{ "errors" : [] }';

    logger.output(data);

    expect(spyingStdout).toBeCalledTimes(1);
    expect(spyingStdout).toBeCalledWith(data);

    spyingStdout.mockRestore();
  });
});

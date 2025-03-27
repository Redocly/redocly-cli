/**
 * @vitest-environment jsdom
 */

import { logger } from '../logger.js';

describe('output', () => {
  it('should ignore all parsable data in browser', () => {
    const spyingStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const data = '{ "errors" : [] }';

    logger.output(data);

    expect(spyingStdout).not.toBeCalled();

    spyingStdout.mockRestore();
  });
});

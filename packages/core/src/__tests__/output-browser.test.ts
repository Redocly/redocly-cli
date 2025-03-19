/**
 * @vitest-environment jsdom
 */

import { output } from '../output';

describe('output', () => {
  it('should ignore all parsable data in browser', () => {
    const spyingStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const data = '{ "errors" : [] }';

    output.write(data);

    expect(spyingStdout).not.toBeCalled();

    spyingStdout.mockRestore();
  });
});

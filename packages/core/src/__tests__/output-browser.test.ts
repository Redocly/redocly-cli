/**
 * @jest-environment jsdom
 */

import { output } from '../output';

describe('output', () => {
  it('should ignore all parsable data in browser', () => {
    const spyingStdout = vi.spyOn(process.stdout, 'write').mockImplementation((...args) => {
      console.log('write', ...args);
      return true; // Fix the type error by returning boolean as required by NodeJS.WriteStream
    });
    const data = '{ "errors" : [] }';

    output.write(data);

    expect(spyingStdout).not.toBeCalled();

    spyingStdout.mockRestore();
  });
});

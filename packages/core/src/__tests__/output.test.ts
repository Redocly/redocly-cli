import { output } from '../output';

describe('output', () => {
  it('should write all parsable data to stdout', () => {
    const spyingStdout = vi.spyOn(process.stdout, 'write').mockImplementation((...args) => {
      console.log('write', ...args);
      return true; // Fix the type error by returning boolean as required by NodeJS.WriteStream
    });
    const data = '{ "errors" : [] }';

    output.write(data);

    expect(spyingStdout).toBeCalledTimes(1);
    expect(spyingStdout).toBeCalledWith(data);

    spyingStdout.mockRestore();
  });
});

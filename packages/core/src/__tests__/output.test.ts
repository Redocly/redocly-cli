import { output } from '../output';

describe('output', () => {
  it('should write all parsable data to stdout', () => {
    const spyingStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const data = '{ "errors" : [] }';

    output.write(data);

    expect(spyingStdout).toBeCalledTimes(1);
    expect(spyingStdout).toBeCalledWith(data);

    spyingStdout.mockRestore();
  });
});

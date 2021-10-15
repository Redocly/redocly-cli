import { handleJoin } from '../../commands/join';

describe('join', () => {
	it('should throw error when only one entrypoint is provided', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation();
    const mockStdErr = jest.spyOn(process.stderr, 'write').mockImplementation();

    const entrypoints = ['foo.yaml'];
    await handleJoin({ entrypoints }, '1.0.0');

    expect(mockStdErr).toHaveBeenCalledWith(expect.stringContaining('At least 2 entrypoints should be provided.'));
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

import { handleJoin, getInfoPrefix } from '../../commands/join';
import { exitWithError } from '../../utils';
jest.mock('../../utils');

describe('join', () => {
  it('should throw error when only one entrypoint is provided', async () => {
    try {
      const entrypoints = ['foo.yaml'];
      await handleJoin({ entrypoints }, '1.0.0');
    } catch {}
    expect(exitWithError).toHaveBeenCalledWith(
      expect.stringContaining('At least 2 entrypoints should be provided.'),
    );
  });

  describe('get info section prefix', () => {
    it('should return empty string if prefix is not provided', () => {
      const result = getInfoPrefix(null, undefined, '');
      expect(result).toEqual('');
    });

    it('should exit with error if info section is not found', () => {
      const errorMessage = 'Info section is not found in specification';
      expect(() => getInfoPrefix(null, 'prefix', '')).toThrow(`process.exit: ${errorMessage}`);
      expect(exitWithError).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });
  });
});

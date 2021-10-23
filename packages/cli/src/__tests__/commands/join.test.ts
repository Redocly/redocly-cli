import { yellow } from 'colorette';
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

    it('should exit with an error if info section is not found', () => {
      const errorMessage = 'Info section is not found in specification';
      expect(() => getInfoPrefix(null, 'prefix', '')).toThrow(`process.exit: ${errorMessage}`);
      expect(exitWithError).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });

    it('should exit with an error if argument value is not found in info section.', () => {
      const errorMessage = `${yellow(
        `prefix-components-with-info-prop`,
      )} argument value is not found in info section. \n`;
      expect(() => getInfoPrefix({}, 'prefix', 'components')).toThrow(
        `process.exit: ${errorMessage}`,
      );
      expect(exitWithError).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });

    it('should exit with an error if argument value is not a string.', () => {
      const errorMessage = `${yellow(
        `prefix-components-with-info-prop`,
      )} argument value should be string. \n\n`;
      expect(() => getInfoPrefix({ test: 1 }, 'test', 'components')).toThrow(
        `process.exit: ${errorMessage}`,
      );
      expect(exitWithError).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });

    it('should exit with an error if argument value exceeds 50 characters', () => {
      const errorMessage = `${yellow(
        `prefix-components-with-info-prop`,
      )} argument value length should not exceed 50 characters. \n\n`;
      expect(() => getInfoPrefix({ test: 's'.repeat(51) }, 'test', 'components')).toThrow(
        `process.exit: ${errorMessage}`,
      );
      expect(exitWithError).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });

    it('should return info section prefix', () => {
      const result = getInfoPrefix({ title: 'Petstore' }, 'title', 'components');
      expect(result).toEqual('Petstore');
    });
  });
});

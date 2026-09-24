import * as path from 'node:path';

import { getFileNamePath } from '../utils/get-file-name-path.js';

describe('getFileNamePath', () => {
  it('should suffix names that differ from a taken one only by case and warn about them', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const takenFileNames = new Map<string, string>();

    expect(getFileNamePath('schemas', 'ApiRequest', '.yaml', takenFileNames)).toBe(
      path.join('schemas', 'ApiRequest.yaml')
    );
    expect(getFileNamePath('schemas', 'apiRequest', '.yaml', takenFileNames)).toBe(
      path.join('schemas', 'apiRequest-2.yaml')
    );
    expect(getFileNamePath('schemas', 'APIREQUEST', '.yaml', takenFileNames)).toBe(
      path.join('schemas', 'APIREQUEST-3.yaml')
    );
    expect(stderrWrite).toHaveBeenCalledTimes(2);
  });

  it('should suffix equal names without a warning', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const takenFileNames = new Map<string, string>();

    expect(getFileNamePath('samples', 'post', '.php', takenFileNames)).toBe(
      path.join('samples', 'post.php')
    );
    expect(getFileNamePath('samples', 'post', '.php', takenFileNames)).toBe(
      path.join('samples', 'post-2.php')
    );
    expect(getFileNamePath('samples', 'get', '', takenFileNames)).toBe(path.join('samples', 'get'));
    expect(getFileNamePath('samples', 'get', '', takenFileNames)).toBe(
      path.join('samples', 'get-2')
    );
    expect(stderrWrite).not.toHaveBeenCalled();
  });
});

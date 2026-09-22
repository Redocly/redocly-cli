import * as path from 'node:path';

import { getUniqueFileNamePath } from '../utils/get-file-name-path.js';

describe('getUniqueFileNamePath', () => {
  it('should suffix file names that differ from a taken one only by case', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const takenFileNames = new Map<string, string>();

    expect(getUniqueFileNamePath('schemas', 'ApiRequest', 'yaml', takenFileNames)).toBe(
      path.join('schemas', 'ApiRequest.yaml')
    );
    expect(getUniqueFileNamePath('schemas', 'apiRequest', 'yaml', takenFileNames)).toBe(
      path.join('schemas', 'apiRequest-2.yaml')
    );
    expect(getUniqueFileNamePath('schemas', 'APIREQUEST', 'yaml', takenFileNames)).toBe(
      path.join('schemas', 'APIREQUEST-3.yaml')
    );
    expect(stderrWrite).toHaveBeenCalledTimes(2);
  });
});

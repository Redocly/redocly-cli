import * as path from 'node:path';

import { getFileNamePath, type FileNameConflict } from '../utils/get-file-name-path.js';

describe('getFileNamePath', () => {
  it('should suffix names that differ from a taken one only by case and collect them as conflicts', () => {
    const takenFileNames = new Map<string, string>();
    const conflicts: FileNameConflict[] = [];

    expect(getFileNamePath('schemas', 'ApiRequest', '.yaml', takenFileNames, conflicts)).toBe(
      path.join('schemas', 'ApiRequest.yaml')
    );
    expect(getFileNamePath('schemas', 'apiRequest', '.yaml', takenFileNames, conflicts)).toBe(
      path.join('schemas', 'apiRequest-2.yaml')
    );
    expect(getFileNamePath('schemas', 'APIREQUEST', '.yaml', takenFileNames, conflicts)).toBe(
      path.join('schemas', 'APIREQUEST-3.yaml')
    );
    expect(conflicts).toEqual([
      {
        name: 'apiRequest',
        collidingName: 'ApiRequest',
        filename: path.join('schemas', 'apiRequest-2.yaml'),
      },
      {
        name: 'APIREQUEST',
        collidingName: 'ApiRequest',
        filename: path.join('schemas', 'APIREQUEST-3.yaml'),
      },
    ]);
  });

  it('should suffix equal names without a conflict', () => {
    const takenFileNames = new Map<string, string>();
    const conflicts: FileNameConflict[] = [];

    expect(getFileNamePath('samples', 'post', '.php', takenFileNames, conflicts)).toBe(
      path.join('samples', 'post.php')
    );
    expect(getFileNamePath('samples', 'post', '.php', takenFileNames, conflicts)).toBe(
      path.join('samples', 'post-2.php')
    );
    expect(getFileNamePath('samples', 'get', '', takenFileNames, conflicts)).toBe(
      path.join('samples', 'get')
    );
    expect(getFileNamePath('samples', 'get', '', takenFileNames, conflicts)).toBe(
      path.join('samples', 'get-2')
    );
    expect(conflicts).toEqual([]);
  });
});

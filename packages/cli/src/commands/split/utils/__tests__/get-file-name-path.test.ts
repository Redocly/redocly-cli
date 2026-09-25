import * as path from 'node:path';

import { getFileNamePath, type FileNameConflict } from '../get-file-name-path.js';

describe('getFileNamePath', () => {
  it('should suffix names that differ from a taken one only by case and collect them as conflicts', () => {
    const takenFileNames = new Map<string, string>();
    const conflicts: FileNameConflict[] = [];

    expect(
      getFileNamePath('schemas', 'ApiRequest', '.yaml', takenFileNames, {
        conflicts,
        pointer: '#/components/schemas/ApiRequest',
      })
    ).toBe(path.join('schemas', 'ApiRequest.yaml'));
    expect(
      getFileNamePath('schemas', 'apiRequest', '.yaml', takenFileNames, {
        conflicts,
        pointer: '#/components/schemas/apiRequest',
      })
    ).toBe(path.join('schemas', 'apiRequest-2.yaml'));
    expect(
      getFileNamePath('schemas', 'APIREQUEST', '.yaml', takenFileNames, {
        conflicts,
        pointer: '#/components/schemas/APIREQUEST',
      })
    ).toBe(path.join('schemas', 'APIREQUEST-3.yaml'));
    expect(conflicts).toEqual([
      {
        name: 'apiRequest',
        collidingName: 'ApiRequest',
        filename: path.join('schemas', 'apiRequest-2.yaml'),
        pointer: '#/components/schemas/apiRequest',
      },
      {
        name: 'APIREQUEST',
        collidingName: 'ApiRequest',
        filename: path.join('schemas', 'APIREQUEST-3.yaml'),
        pointer: '#/components/schemas/APIREQUEST',
      },
    ]);
  });

  it('should suffix names that are not case variants without a conflict', () => {
    const takenFileNames = new Map<string, string>();
    const conflicts: FileNameConflict[] = [];
    const conflictReport = { conflicts, pointer: '#/paths/~1menu' };

    expect(getFileNamePath('samples', 'post', '.php', takenFileNames, conflictReport)).toBe(
      path.join('samples', 'post.php')
    );
    expect(getFileNamePath('samples', 'post', '.php', takenFileNames, conflictReport)).toBe(
      path.join('samples', 'post-2.php')
    );
    expect(getFileNamePath('samples', 'post-2', '.php', takenFileNames, conflictReport)).toBe(
      path.join('samples', 'post-2-2.php')
    );
    expect(getFileNamePath('samples', 'get', '', takenFileNames, conflictReport)).toBe(
      path.join('samples', 'get')
    );
    expect(getFileNamePath('samples', 'get', '', takenFileNames, conflictReport)).toBe(
      path.join('samples', 'get-2')
    );
    expect(conflicts).toEqual([]);
  });
});

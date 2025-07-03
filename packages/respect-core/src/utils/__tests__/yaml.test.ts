import { readFileSync } from 'fs';
import { parseYaml, readYaml } from '../yaml.js';

vi.mock('node:fs');

describe('yaml', () => {
  describe('parseYaml', () => {
    it('should parse yaml', () => {
      const yaml = `
        name: test
        description: test
      `;
      expect(parseYaml(yaml)).toEqual({
        name: 'test',
        description: 'test',
      });
    });
  });

  describe('readYaml', () => {
    const yaml = `
        name: test
        description: test
      `;
    const path = './test.yaml';

    it('should read yaml', () => {
      vi.mocked(readFileSync).mockReturnValue(yaml);

      expect(readYaml(path)).toEqual({
        name: 'test',
        description: 'test',
      });
      expect(readFileSync).toHaveBeenCalledWith(path, 'utf-8');
    });

    it('should read yaml with options', () => {
      vi.mocked(readFileSync).mockReturnValue(yaml);

      expect(readYaml(path)).toEqual({
        name: 'test',
        description: 'test',
      });
      expect(readFileSync).toHaveBeenCalledWith(path, 'utf-8');
    });
  });
});

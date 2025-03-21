import { readFileSync } from 'fs';
import { parseYaml, stringifyYaml, readYaml } from '../yaml.js';

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

  describe('stringifyYaml', () => {
    it('should stringify yaml', () => {
      const yaml = `
        name: test
        description: test
      `;
      expect(stringifyYaml(parseYaml(yaml))).toEqual(`name: test\ndescription: test\n`);
    });

    it('should stringify yaml with options', () => {
      const yaml = `
        name: test
        description: test
      `;
      expect(stringifyYaml(parseYaml(yaml), { noRefs: true })).toEqual(
        `name: test\ndescription: test\n`
      );
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

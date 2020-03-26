import { join } from 'path';
import { readFileSync } from 'fs';
import yaml from 'js-yaml';

import resolveNode from '../resolver';
import createContext from '../context';
import { getLintConfig } from '../config';

tests('local', 'index.yaml');
tests('external', 'external.yaml');

function tests(type, resolvedFileName) {
  describe(`Transitive $refs ${type} file`, () => {
    let ctx;
    let doc;

    beforeEach(async () => {
      const file = join(__dirname, 'data', 'index.yaml');
      const source = readFileSync(file, 'utf-8');
      const document = yaml.safeLoad(source);

      ctx = createContext(document, source, file, getLintConfig({}));
      ctx.path = [type];
      doc = document[type];
    });

    test('should successfully resolve transitive $ref', async () => {
      ctx.path.push('test1');
      const res = await resolveNode(doc.test1, ctx);
      expect(res).toMatchInlineSnapshot(`
        Object {
          "node": Object {
            "type": "string",
          },
          "onStack": true,
        }
      `);
      expect(ctx.result).toHaveLength(0);
    });

    test('should fail to resolve incorrect transitive $ref with correct error at initial file', async () => {
      ctx.path.push('test2');
      const res = await resolveNode(doc.test2, ctx);
      expect(res.node).toEqual(doc.test2);
      expect(ctx.result).toHaveLength(1);
      expect(ctx.result[0].file).toMatch('index.yaml');
      expect(ctx.result[0].path).toEqual([type, 'test2', '$ref']);
    });

    test('should fail to resolve incorrect transitive $ref with error at first unresolved $ref', async () => {
      ctx.path.push('test3');
      const res = await resolveNode(doc.test3, ctx);
      expect(res.node).toEqual(doc.test3);
      expect(ctx.result).toHaveLength(1);
      expect(ctx.result[0].file).toMatch(resolvedFileName);

      // error at first ref that can't be resolved
      expect(ctx.result[0].path).toEqual(['transitiveLocalBad', '$ref']);
      // referenced from at starting $ref
      expect(ctx.result[0].referencedFrom.path).toEqual([type, 'test3']);
    });

    test('should fail to resolve circular transitive $ref', async () => {
      ctx.path.push('test4');
      const res = await resolveNode(doc.test4, ctx);
      expect(res.node).toEqual(doc.test4);
      expect(ctx.result).toHaveLength(1);
      expect(ctx.result[0].file).toMatch(resolvedFileName);

      expect(ctx.result[0].path).toEqual(['recursive', 'b', '$ref']);
      expect(ctx.result[0].referencedFrom.path).toEqual([type, 'test4']);
      expect(ctx.result[0].message).toMatch(/circular/i);
    });
  });
}

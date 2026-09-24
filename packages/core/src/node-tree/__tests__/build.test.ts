import { outdent } from 'outdent';

import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { getTypes } from '../../oas-types.js';
import { makeDocumentFromString } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { buildNodeTree } from '../build.js';

async function buildTree(yaml: string) {
  const document = makeDocumentFromString(yaml, 'cafe.yaml');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return buildNodeTree({ document, types, specVersion });
}

const cafe = (menuItemRef: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths:
    /menu:
      get:
        parameters:
          - { name: limit, in: query }
        responses:
          '200':
            description: OK
            content:
              application/json:
                schema: { $ref: '${menuItemRef}' }
  components:
    schemas:
      Menu Item: { type: object }
`;

describe('buildNodeTree', () => {
  it('should build the document as a tree of typed nodes with their keys, values and locations', async () => {
    const { root } = await buildTree(cafe('#/components/schemas/Menu%20Item'));
    const [info, paths, components] = root.children;
    const [menu] = paths.children;
    const [listMenu] = menu.children;
    const [parameters] = listMenu.children;
    const [limit] = parameters.children;

    expect(root.type).toBe('Root');
    expect(info.type).toBe('Info');
    expect(components.type).toBe('Components');
    expect(menu).toMatchObject({ type: 'PathItem', key: '/menu', parent: paths });
    expect(parameters).toMatchObject({ type: 'ParameterList', key: 'parameters' });
    expect(limit).toMatchObject({
      type: 'Parameter',
      key: 0,
      value: { name: 'limit', in: 'query' },
      parent: parameters,
    });
    expect(limit.location.pointer).toBe('#/paths/~1menu/get/parameters/0');
  });

  it('should make a $ref a node of the type its place expects, pointing at its target', async () => {
    const { root, references } = await buildTree(cafe('#/components/schemas/Menu%20Item'));
    const [, , components] = root.children;
    const [schemas] = components.children;
    const [menuItem] = schemas.children;
    const [reference] = references;

    expect(references).toHaveLength(1);
    expect(reference.from).toMatchObject({
      type: 'Schema',
      key: 'schema',
      value: { $ref: '#/components/schemas/Menu%20Item' },
      target: menuItem,
    });
    expect(reference.to).toBe(menuItem);
  });

  it('should leave a $ref that does not resolve without a target', async () => {
    const { references } = await buildTree(cafe('#/components/schemas/Dessert'));

    expect(references).toEqual([]);
  });
});

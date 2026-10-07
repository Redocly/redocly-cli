import { outdent } from 'outdent';

import { resolverWithFiles } from '../../../__tests__/utils.js';
import { enclosing, keyKindOf, locationOf, valueOf } from '../access.js';
import { buildTree, cafe, nodeAt } from './utils.js';

const menuItemDocument = () =>
  cafe(outdent`
    paths:
      /menu:
        get:
          parameters:
            - { name: item, in: query, schema: { $ref: '#/components/schemas/MenuItem' } }
    components:
      schemas:
        MenuItem:
          type: object
          properties:
            name: { type: string }
  `);

describe('node access', () => {
  it('should give what a $ref points at, or else the node itself, for its value and location', async () => {
    const { root } = await buildTree(menuItemDocument());
    const menuItemRef = nodeAt(root, '#/paths/~1menu/get/parameters/0/schema')!;
    const menuItem = nodeAt(root, '#/components/schemas/MenuItem')!;

    expect(valueOf(menuItemRef)).toBe(menuItem.value);
    expect(locationOf(menuItemRef)).toBe(menuItem.location);
    expect(valueOf(menuItem)).toBe(menuItem.value);
    expect(locationOf(menuItem)).toBe(menuItem.location);
  });

  it('should tell a field of the type from a map entry and a list item', async () => {
    const { root } = await buildTree(menuItemDocument());

    expect(keyKindOf(nodeAt(root, '#/paths')!)).toBe('field');
    expect(keyKindOf(nodeAt(root, '#/paths/~1menu')!)).toBe('entry');
    expect(keyKindOf(nodeAt(root, '#/paths/~1menu/get/parameters/0')!)).toBe('item');
  });

  it('should climb from a node in another file to the $ref that reaches it', async () => {
    const externalRefResolver = resolverWithFiles({ 'menu.yaml': 'get: {}' });
    const { root } = await buildTree(
      cafe(outdent`
        paths:
          /menu: { $ref: menu.yaml }
      `),
      externalRefResolver
    );
    const getOperation = nodeAt(root, '#/paths/~1menu')!.resolved!.children[0];

    expect(enclosing(getOperation, 'Paths')).toBe(nodeAt(root, '#/paths'));
    expect(enclosing(getOperation, 'Components')).toBeUndefined();
  });

  it('should end the climb where a $ref leads back into the node', async () => {
    const externalRefResolver = resolverWithFiles({
      'menu.yaml': '{ $ref: ./item.yaml, summary: Menu }',
      'item.yaml': outdent`
        get:
          responses:
            '200': { description: OK }
          callbacks:
            onEvent:
              '{$request.body#/url}': { $ref: '#' }
      `,
    });
    const { root } = await buildTree(
      cafe(outdent`
        paths:
          /menu: { $ref: ./menu.yaml }
      `),
      externalRefResolver
    );
    const item = nodeAt(root, '#/paths/~1menu')!.resolved!.resolved!;
    const responses = nodeAt(item, '#/get/responses')!;

    expect(enclosing(responses, 'Paths')).toBe(nodeAt(root, '#/paths'));
    expect(enclosing(responses, 'Components')).toBeUndefined();
  });
});

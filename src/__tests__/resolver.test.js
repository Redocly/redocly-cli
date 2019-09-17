import resolveNode from '../resolver';

test('Resolve a node without a $ref', () => {
  const document = {
    components: {
      schemas: {
        user: {
          properties: ['name', 'email'],
        },
      },
    },
  };
  const context = { document };
  const node = {
    property: 'value',
  };
  expect(resolveNode(node, context)).toMatchInlineSnapshot(`
    Object {
      "nextPath": undefined,
      "node": Object {
        "property": "value",
      },
    }
  `);
});

test('Resolve a node with a one $ref', () => {
  const document = {
    components: {
      schemas: {
        user: {
          properties: ['name', 'email'],
        },
      },
    },
  };
  const context = { document };
  const node = {
    $ref: '#/components/schemas/user',
  };
  expect(resolveNode(node, context)).toMatchInlineSnapshot(`
    Object {
      "nextPath": "#/components/schemas/user",
      "node": Object {
        "properties": Array [
          "name",
          "email",
        ],
      },
    }
  `);
});

test('Resolve node with $ref and content', () => {
  const document = {
    components: {
      schemas: {
        user: {
          properties: ['name', 'email'],
        },
      },
    },
  };
  const context = { document };
  const node = {
    $ref: '#/components/schemas/user',
    properties: ['thisShouldNotPersist'],
  };
  expect(resolveNode(node, context)).toMatchInlineSnapshot(`
    Object {
      "nextPath": "#/components/schemas/user",
      "node": Object {
        "properties": Array [
          "name",
          "email",
        ],
      },
    }
  `);
});

// test('Resolve address', () => {
//   const document = {
//     components: {
//       schemas: {
//         user: {
//           properties: ['name', 'email'],
//         },
//       },
//     },
//   };
//   expect(resolve('#/components/schemas/user', { document }))
//     .toMatchInlineSnapshot(`
//     Object {
//       "properties": Array [
//         "name",
//         "email",
//       ],
//     }
//   `);
// });

// test('Resolve address which does not exists', () => {
//   const document = {
//     components: {
//       schemas: {
//         user: {
//           properties: ['name', 'email'],
//         },
//       },
//     },
//   };
//   expect(
//     resolve('#/components/schemas/anotherUser', { document }),
//   ).toMatchInlineSnapshot('null');
// });

import traverse from "./../traverse";

test("Traverse over a flat node with empty resolver", () => {
  const node = {
    name: "test node",
    value: 12
  };
  const resolver = {};
  expect(traverse(node, resolver)).toMatchInlineSnapshot(`Array []`);
});


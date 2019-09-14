import createError from "./../error";

test("Error message format", () => {
  expect(
    createError(
      "You error text goes here",
      { example: "node" },
      { path: ["paths", "user", "200", "responses"] }
    )
  ).toMatchInlineSnapshot(`
    Object {
      "message": "You error text goes here",
      "path": "/paths/user/200/responses",
      "severity": "ERROR",
      "value": Object {
        "example": "node",
      },
    }
  `);
});

import { validateFromFile } from "./../index";

test("validate simple document", () => {
  expect(
    validateFromFile("./test/specs/openapi/simple.yaml")
  ).toMatchInlineSnapshot(`Array []`);
});

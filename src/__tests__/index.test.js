import { validateFromFile } from "./../index";

test("validate simple document", () => {
  expect(
    validateFromFile("./test/specs/openapi/simple.yaml")
  ).toMatchInlineSnapshot(`Array []`);
});

test("Validate simple valid OpenAPI document", () => {
  expect(
    validateFromFile("./test/specs/openapi/valid-2.yaml")
  ).toMatchInlineSnapshot(`Array []`);
});

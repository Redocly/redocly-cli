import fs from "fs";

import traverse from "../traverse";
import { validateFromFile } from "../validate";

describe("Traverse files", () => {
  test("syntetic/syntetic-1.yaml", () => {
    expect(
      validateFromFile("./definitions/syntetic/syntetic-1.yaml", {})
    ).toMatchInlineSnapshot(`Array []`);
  });

  test("syntetic/syntetic-1.yaml", () => {
    expect(
      validateFromFile("./definitions/openapi-directory/rebilly-full.yaml", {})
    ).toMatchInlineSnapshot(`Array []`);
  });

  test("syntetic/syntetic-1.yaml", () => {
    expect(validateFromFile("./definitions/syntetic/to_bundle/main.yaml", {}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "codeFrame": "[90m09|       type: string[39m
      [90m10|     noRef:[39m
      [90m11|       [4m[31m$ref: 'bad.yaml#/does/not/exist'[0m[24m[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/to_bundle/components/parameters/parameter.name.yml",
          "fromRule": "resolve-ref",
          "location": Object {
            "endCol": 39,
            "endIndex": 182,
            "endLine": 11,
            "startCol": 7,
            "startIndex": 150,
            "startLine": 11,
          },
          "message": "Reference does not exist.",
          "path": Array [
            "schema",
            "properties",
            "noRef",
            "$ref",
          ],
          "pathStack": Array [
            Object {
              "file": "definitions/syntetic/to_bundle/main.yaml",
              "path": Array [
                "paths",
                "/api",
                "get",
              ],
              "startLine": 12,
            },
            Object {
              "file": "definitions/syntetic/to_bundle/operations/api/api-get.yaml",
              "path": Array [
                "parameters",
                0,
              ],
              "startLine": 2,
            },
          ],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": undefined,
          "value": Object {
            "$ref": "bad.yaml#/does/not/exist",
          },
        },
      ]
    `);
  });
});

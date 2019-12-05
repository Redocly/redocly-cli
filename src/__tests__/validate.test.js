import fs from "fs";

import traverse from "../traverse";
import { validateFromFile } from "../validate";

describe("Traverse files", () => {
  test("syntetic/syntetic-1.yaml", () => {
    expect(
      validateFromFile("./definitions/syntetic/syntetic-1.yaml", {
        rulesRedefine: "./definitions/rulesRedefine.js",
        typeExtension: "./definitions/typeExtension.js"
      })
    ).toMatchInlineSnapshot(`Array []`);
  });

  test("syntetic/syntetic-1.yaml", () => {
    expect(
      validateFromFile("./definitions/openapi-directory/rebilly-full.yaml", {})
    ).toMatchInlineSnapshot(`Array []`);
  });

  test("syntetic/syntetic-1.yaml", () => {
    expect(
      validateFromFile("./definitions/syntetic/to_bundle/main.yaml", {})
    ).toMatchInlineSnapshot(`Array []`);
  });

  test("syntetic/syntetic-1.yaml", () => {
    expect(validateFromFile("./definitions/syntetic/syntetic-1.yaml", {}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "codeFrame": "[90m51|   parameters:[39m
      [90m52|     example:[39m
      [90m53|       [4m[31mallOf[90m[24m:[39m
      [90m54|         - name: bla[39m
      [90m55|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1172,
            "endLine": 53,
            "startCol": 7,
            "startIndex": 1167,
            "startLine": 53,
          },
          "message": "The field 'allOf' is not allowed in OpenAPIParameter. Use \\"x-\\" prefix to override this behavior.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
          ],
          "pathStack": Array [
            Object {
              "file": "definitions/syntetic/syntetic-1.yaml",
              "path": Array [
                "paths",
                "user",
                "parameters",
                0,
              ],
              "startLine": 18,
            },
          ],
          "possibleAlternate": null,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": Array [
              Object {
                "in": "query",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "string",
                },
              },
              Object {
                "description": "blo",
              },
              Object {
                "description": "bla",
              },
            ],
          },
        },
        Object {
          "codeFrame": "[90m50|       bearerFormat: JWT[39m
      [90m51|   parameters:[39m
      [90m52|     [4m[31mexample[90m[24m:[39m
      [90m53|       allOf:[39m
      [90m54|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1159,
            "endLine": 52,
            "startCol": 5,
            "startIndex": 1152,
            "startLine": 52,
          },
          "message": "The field 'name' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "name",
          ],
          "pathStack": Array [
            Object {
              "file": "definitions/syntetic/syntetic-1.yaml",
              "path": Array [
                "paths",
                "user",
                "parameters",
                0,
              ],
              "startLine": 18,
            },
          ],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": Array [
              Object {
                "in": "query",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "string",
                },
              },
              Object {
                "description": "blo",
              },
              Object {
                "description": "bla",
              },
            ],
          },
        },
        Object {
          "codeFrame": "[90m50|       bearerFormat: JWT[39m
      [90m51|   parameters:[39m
      [90m52|     [4m[31mexample[90m[24m:[39m
      [90m53|       allOf:[39m
      [90m54|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1159,
            "endLine": 52,
            "startCol": 5,
            "startIndex": 1152,
            "startLine": 52,
          },
          "message": "The field 'in' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "in",
          ],
          "pathStack": Array [
            Object {
              "file": "definitions/syntetic/syntetic-1.yaml",
              "path": Array [
                "paths",
                "user",
                "parameters",
                0,
              ],
              "startLine": 18,
            },
          ],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": Array [
              Object {
                "in": "query",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "string",
                },
              },
              Object {
                "description": "blo",
              },
              Object {
                "description": "bla",
              },
            ],
          },
        },
        Object {
          "codeFrame": "[90m51|   parameters:[39m
      [90m52|     example:[39m
      [90m53|       [4m[31mallOf[90m[24m:[39m
      [90m54|         - name: bla[39m
      [90m55|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1172,
            "endLine": 53,
            "startCol": 7,
            "startIndex": 1167,
            "startLine": 53,
          },
          "message": "The field 'allOf' is not allowed in OpenAPIParameter. Use \\"x-\\" prefix to override this behavior.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
          ],
          "pathStack": Array [],
          "possibleAlternate": null,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": Array [
              Object {
                "in": "query",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "string",
                },
              },
              Object {
                "description": "blo",
              },
              Object {
                "description": "bla",
              },
            ],
          },
        },
        Object {
          "codeFrame": "[90m50|       bearerFormat: JWT[39m
      [90m51|   parameters:[39m
      [90m52|     [4m[31mexample[90m[24m:[39m
      [90m53|       allOf:[39m
      [90m54|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1159,
            "endLine": 52,
            "startCol": 5,
            "startIndex": 1152,
            "startLine": 52,
          },
          "message": "The field 'name' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "name",
          ],
          "pathStack": Array [],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": Array [
              Object {
                "in": "query",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "string",
                },
              },
              Object {
                "description": "blo",
              },
              Object {
                "description": "bla",
              },
            ],
          },
        },
        Object {
          "codeFrame": "[90m50|       bearerFormat: JWT[39m
      [90m51|   parameters:[39m
      [90m52|     [4m[31mexample[90m[24m:[39m
      [90m53|       allOf:[39m
      [90m54|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1159,
            "endLine": 52,
            "startCol": 5,
            "startIndex": 1152,
            "startLine": 52,
          },
          "message": "The field 'in' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "in",
          ],
          "pathStack": Array [],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": Array [
              Object {
                "in": "query",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "string",
                },
              },
              Object {
                "description": "blo",
              },
              Object {
                "description": "bla",
              },
            ],
          },
        },
      ]
    `);
  });
});

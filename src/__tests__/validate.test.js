import fs from "fs";

import traverse from "../traverse";
import { validateFromFile } from "../validate";

describe("Traverse files", () => {
  test("syntetic/syntetic-1.yaml", () => {
    expect(validateFromFile("./definitions/syntetic/syntetic-1.yaml"))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "codeFrame": "[90m57|   parameters:[39m
      [90m58|     example:[39m
      [90m59|       [4m[31mallOf[90m[24m:[39m
      [90m60|         - name: bla[39m
      [90m61|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1287,
            "endLine": 59,
            "startCol": 7,
            "startIndex": 1282,
            "startLine": 59,
          },
          "message": "The field 'allOf' is not allowed in OpenAPIParameter. Use \\"x-\\" prefix or custom types to override this behavior.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
          ],
          "possibleAlternate": Object {
            "possibleAlternate": null,
          },
          "referencedFrom": Object {
            "file": "definitions/syntetic/syntetic-1.yaml",
            "path": Array [
              "paths",
              "user",
              "parameters",
              0,
            ],
            "startLine": 20,
          },
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
          "codeFrame": "[90m56|       bearerFormat: JWT[39m
      [90m57|   parameters:[39m
      [90m58|     [4m[31mexample[90m[24m:[39m
      [90m59|       allOf:[39m
      [90m60|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1274,
            "endLine": 58,
            "startCol": 5,
            "startIndex": 1267,
            "startLine": 58,
          },
          "message": "The field 'name' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "name",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": Object {
            "file": "definitions/syntetic/syntetic-1.yaml",
            "path": Array [
              "paths",
              "user",
              "parameters",
              0,
            ],
            "startLine": 20,
          },
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
          "codeFrame": "[90m56|       bearerFormat: JWT[39m
      [90m57|   parameters:[39m
      [90m58|     [4m[31mexample[90m[24m:[39m
      [90m59|       allOf:[39m
      [90m60|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1274,
            "endLine": 58,
            "startCol": 5,
            "startIndex": 1267,
            "startLine": 58,
          },
          "message": "The field 'in' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "in",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": Object {
            "file": "definitions/syntetic/syntetic-1.yaml",
            "path": Array [
              "paths",
              "user",
              "parameters",
              0,
            ],
            "startLine": 20,
          },
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
          "codeFrame": "[90m57|   parameters:[39m
      [90m58|     example:[39m
      [90m59|       [4m[31mallOf[90m[24m:[39m
      [90m60|         - name: bla[39m
      [90m61|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1287,
            "endLine": 59,
            "startCol": 7,
            "startIndex": 1282,
            "startLine": 59,
          },
          "message": "The field 'allOf' is not allowed in OpenAPIParameter. Use \\"x-\\" prefix or custom types to override this behavior.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
          ],
          "possibleAlternate": Object {
            "possibleAlternate": null,
          },
          "referencedFrom": null,
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
          "codeFrame": "[90m56|       bearerFormat: JWT[39m
      [90m57|   parameters:[39m
      [90m58|     [4m[31mexample[90m[24m:[39m
      [90m59|       allOf:[39m
      [90m60|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1274,
            "endLine": 58,
            "startCol": 5,
            "startIndex": 1267,
            "startLine": 58,
          },
          "message": "The field 'name' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "name",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": null,
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
          "codeFrame": "[90m56|       bearerFormat: JWT[39m
      [90m57|   parameters:[39m
      [90m58|     [4m[31mexample[90m[24m:[39m
      [90m59|       allOf:[39m
      [90m60|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1274,
            "endLine": 58,
            "startCol": 5,
            "startIndex": 1267,
            "startLine": 58,
          },
          "message": "The field 'in' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "in",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": null,
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
          "codeFrame": "[90m43|   description:[39m
      [90m44|     $ref: README.md[39m
      [90m45|   [4m[31murl: googlecom[90m[24m[39m
      [90m46| components:[39m
      [90m47|   securitySchemes:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/external-docs",
          "location": Object {
            "endCol": 16,
            "endIndex": 922,
            "endLine": 45,
            "startCol": 3,
            "startIndex": 908,
            "startLine": 45,
          },
          "message": "url must be a valid URL",
          "path": Array [
            "externalDocs",
            "url",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": null,
          "severity": 4,
          "target": "value",
          "value": Object {
            "description": "some test",
            "url": "googlecom",
          },
        },
      ]
    `);
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
          "codeFrame": "[90m57|   parameters:[39m
      [90m58|     example:[39m
      [90m59|       [4m[31mallOf[90m[24m:[39m
      [90m60|         - name: bla[39m
      [90m61|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1287,
            "endLine": 59,
            "startCol": 7,
            "startIndex": 1282,
            "startLine": 59,
          },
          "message": "The field 'allOf' is not allowed in OpenAPIParameter. Use \\"x-\\" prefix or custom types to override this behavior.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
          ],
          "possibleAlternate": Object {
            "possibleAlternate": null,
          },
          "referencedFrom": Object {
            "file": "definitions/syntetic/syntetic-1.yaml",
            "path": Array [
              "paths",
              "user",
              "parameters",
              0,
            ],
            "startLine": 20,
          },
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
          "codeFrame": "[90m56|       bearerFormat: JWT[39m
      [90m57|   parameters:[39m
      [90m58|     [4m[31mexample[90m[24m:[39m
      [90m59|       allOf:[39m
      [90m60|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1274,
            "endLine": 58,
            "startCol": 5,
            "startIndex": 1267,
            "startLine": 58,
          },
          "message": "The field 'name' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "name",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": Object {
            "file": "definitions/syntetic/syntetic-1.yaml",
            "path": Array [
              "paths",
              "user",
              "parameters",
              0,
            ],
            "startLine": 20,
          },
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
          "codeFrame": "[90m56|       bearerFormat: JWT[39m
      [90m57|   parameters:[39m
      [90m58|     [4m[31mexample[90m[24m:[39m
      [90m59|       allOf:[39m
      [90m60|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1274,
            "endLine": 58,
            "startCol": 5,
            "startIndex": 1267,
            "startLine": 58,
          },
          "message": "The field 'in' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "in",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": Object {
            "file": "definitions/syntetic/syntetic-1.yaml",
            "path": Array [
              "paths",
              "user",
              "parameters",
              0,
            ],
            "startLine": 20,
          },
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
          "codeFrame": "[90m57|   parameters:[39m
      [90m58|     example:[39m
      [90m59|       [4m[31mallOf[90m[24m:[39m
      [90m60|         - name: bla[39m
      [90m61|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1287,
            "endLine": 59,
            "startCol": 7,
            "startIndex": 1282,
            "startLine": 59,
          },
          "message": "The field 'allOf' is not allowed in OpenAPIParameter. Use \\"x-\\" prefix or custom types to override this behavior.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
          ],
          "possibleAlternate": Object {
            "possibleAlternate": null,
          },
          "referencedFrom": null,
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
          "codeFrame": "[90m56|       bearerFormat: JWT[39m
      [90m57|   parameters:[39m
      [90m58|     [4m[31mexample[90m[24m:[39m
      [90m59|       allOf:[39m
      [90m60|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1274,
            "endLine": 58,
            "startCol": 5,
            "startIndex": 1267,
            "startLine": 58,
          },
          "message": "The field 'name' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "name",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": null,
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
          "codeFrame": "[90m56|       bearerFormat: JWT[39m
      [90m57|   parameters:[39m
      [90m58|     [4m[31mexample[90m[24m:[39m
      [90m59|       allOf:[39m
      [90m60|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1274,
            "endLine": 58,
            "startCol": 5,
            "startIndex": 1267,
            "startLine": 58,
          },
          "message": "The field 'in' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "in",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": null,
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
          "codeFrame": "[90m43|   description:[39m
      [90m44|     $ref: README.md[39m
      [90m45|   [4m[31murl: googlecom[90m[24m[39m
      [90m46| components:[39m
      [90m47|   securitySchemes:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/external-docs",
          "location": Object {
            "endCol": 16,
            "endIndex": 922,
            "endLine": 45,
            "startCol": 3,
            "startIndex": 908,
            "startLine": 45,
          },
          "message": "url must be a valid URL",
          "path": Array [
            "externalDocs",
            "url",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": null,
          "severity": 4,
          "target": "value",
          "value": Object {
            "description": "some test",
            "url": "googlecom",
          },
        },
      ]
    `);
  });
});

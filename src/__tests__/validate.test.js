import fs from "fs";

import traverse from "../traverse";
import { validateFromFile } from "../validate";

describe("Traverse files", () => {
  test("syntetic/syntetic-1.yaml", async () => {
    expect(await validateFromFile("./definitions/syntetic/syntetic-1.yaml"))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample:[39m[90m[24m[39m
      [90m77|[39m[31m [4m[31m      allOf:[39m[31m[24m[39m
      [90m78|[39m[31m [4m[31m        - name: bla[39m[31m[24m[39m
      [90m79|[39m[31m [4m[31m          in: query[39m[31m[24m[39m
      [90m80|[39m[31m [4m[31m          required: false[39m[31m[24m[39m
      [90m81|[39m[31m [4m[31m          schema:[39m[31m[24m[39m
      [90m82|[39m[31m [4m[31m            type: string[39m[31m[24m[39m
      [90m83|[39m[31m [4m[31m        - description: blo[39m[31m[24m[39m
      [90m84|[39m[31m [4m[31m        - description: bla[39m[31m[24m[39m
      [90m85| [4m[31m    [39m[90m[24mgenericExample:[39m
      [90m86|       name: example[39m
      [90m87|       in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "path-param-exists",
          "location": Object {
            "endCol": 5,
            "endIndex": 1894,
            "endLine": 85,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
          },
          "message": "The \\"name\\" field value is not in the current path.",
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
          "target": "value",
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
          "codeFrame": "[90m75|   parameters:[39m
      [90m76|     example:[39m
      [90m77|       [4m[31mallOf[39m[90m[24m:[39m
      [90m78|         - name: bla[39m
      [90m79|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1725,
            "endLine": 77,
            "startCol": 7,
            "startIndex": 1720,
            "startLine": 77,
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
          "severity": 3,
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
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample[39m[90m[24m:[39m
      [90m77|       allOf:[39m
      [90m78|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1712,
            "endLine": 76,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
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
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample[39m[90m[24m:[39m
      [90m77|       allOf:[39m
      [90m78|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1712,
            "endLine": 76,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
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
          "codeFrame": "[90m44|       parameters:[39m
      [90m45|         - in: path[39m
      [90m46|           [4m[31mname: test[39m[90m[24m[39m
      [90m47|           description: User id[39m
      [90m48|           required: true[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "path-param-exists",
          "location": Object {
            "endCol": 20,
            "endIndex": 939,
            "endLine": 46,
            "startCol": 11,
            "startIndex": 929,
            "startLine": 46,
          },
          "message": "The \\"name\\" field value is not in the current path.",
          "path": Array [
            "paths",
            "/user/{id}",
            "get",
            "parameters",
            0,
            "name",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": null,
          "severity": 4,
          "target": "value",
          "value": Object {
            "description": "User id",
            "in": "path",
            "name": "test",
            "required": true,
            "schema": Object {
              "type": "string",
            },
          },
        },
        Object {
          "codeFrame": "[90m75|   parameters:[39m
      [90m76|     example:[39m
      [90m77|       [4m[31mallOf[39m[90m[24m:[39m
      [90m78|         - name: bla[39m
      [90m79|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1725,
            "endLine": 77,
            "startCol": 7,
            "startIndex": 1720,
            "startLine": 77,
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
          "severity": 3,
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
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample[39m[90m[24m:[39m
      [90m77|       allOf:[39m
      [90m78|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1712,
            "endLine": 76,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
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
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample[39m[90m[24m:[39m
      [90m77|       allOf:[39m
      [90m78|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1712,
            "endLine": 76,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
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
          "codeFrame": "[90m61|   description:[39m
      [90m62|     $ref: inc/docs-description.md[39m
      [90m63|   [4m[31murl: googlecom[39m[90m[24m[39m
      [90m64| components:[39m
      [90m65|   securitySchemes:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/external-docs",
          "location": Object {
            "endCol": 16,
            "endIndex": 1360,
            "endLine": 63,
            "startCol": 3,
            "startIndex": 1346,
            "startLine": 63,
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
            "description": "# Test markdown file

      This is a test markdown file.

      Include it in your OpenAPI definition description like this: 


          description:
            $ref: path/to/file.md
      ",
            "url": "googlecom",
          },
        },
      ]
    `);
  });

  test("syntetic/syntetic-1.yaml", async () => {
    expect(
      await validateFromFile(
        "./definitions/openapi-directory/rebilly-full.yaml",
        {
          lint: {
            rules: {
              "operation-tags-defined": "off",
            },
          },
        }
      )
    ).toMatchInlineSnapshot(`Array []`);
  });

  test("syntetic/syntetic-1.yaml", async () => {
    expect(
      await validateFromFile("./definitions/syntetic/to_bundle/main.yaml", {})
    ).toMatchInlineSnapshot(`Array []`);
  });

  test("syntetic/syntetic-1.yaml", async () => {
    expect(await validateFromFile("./definitions/syntetic/syntetic-1.yaml", {}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample:[39m[90m[24m[39m
      [90m77|[39m[31m [4m[31m      allOf:[39m[31m[24m[39m
      [90m78|[39m[31m [4m[31m        - name: bla[39m[31m[24m[39m
      [90m79|[39m[31m [4m[31m          in: query[39m[31m[24m[39m
      [90m80|[39m[31m [4m[31m          required: false[39m[31m[24m[39m
      [90m81|[39m[31m [4m[31m          schema:[39m[31m[24m[39m
      [90m82|[39m[31m [4m[31m            type: string[39m[31m[24m[39m
      [90m83|[39m[31m [4m[31m        - description: blo[39m[31m[24m[39m
      [90m84|[39m[31m [4m[31m        - description: bla[39m[31m[24m[39m
      [90m85| [4m[31m    [39m[90m[24mgenericExample:[39m
      [90m86|       name: example[39m
      [90m87|       in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "path-param-exists",
          "location": Object {
            "endCol": 5,
            "endIndex": 1894,
            "endLine": 85,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
          },
          "message": "The \\"name\\" field value is not in the current path.",
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
          "target": "value",
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
          "codeFrame": "[90m75|   parameters:[39m
      [90m76|     example:[39m
      [90m77|       [4m[31mallOf[39m[90m[24m:[39m
      [90m78|         - name: bla[39m
      [90m79|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1725,
            "endLine": 77,
            "startCol": 7,
            "startIndex": 1720,
            "startLine": 77,
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
          "severity": 3,
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
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample[39m[90m[24m:[39m
      [90m77|       allOf:[39m
      [90m78|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1712,
            "endLine": 76,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
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
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample[39m[90m[24m:[39m
      [90m77|       allOf:[39m
      [90m78|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1712,
            "endLine": 76,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
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
          "codeFrame": "[90m44|       parameters:[39m
      [90m45|         - in: path[39m
      [90m46|           [4m[31mname: test[39m[90m[24m[39m
      [90m47|           description: User id[39m
      [90m48|           required: true[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "path-param-exists",
          "location": Object {
            "endCol": 20,
            "endIndex": 939,
            "endLine": 46,
            "startCol": 11,
            "startIndex": 929,
            "startLine": 46,
          },
          "message": "The \\"name\\" field value is not in the current path.",
          "path": Array [
            "paths",
            "/user/{id}",
            "get",
            "parameters",
            0,
            "name",
          ],
          "possibleAlternate": undefined,
          "referencedFrom": null,
          "severity": 4,
          "target": "value",
          "value": Object {
            "description": "User id",
            "in": "path",
            "name": "test",
            "required": true,
            "schema": Object {
              "type": "string",
            },
          },
        },
        Object {
          "codeFrame": "[90m75|   parameters:[39m
      [90m76|     example:[39m
      [90m77|       [4m[31mallOf[39m[90m[24m:[39m
      [90m78|         - name: bla[39m
      [90m79|           in: query[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 1725,
            "endLine": 77,
            "startCol": 7,
            "startIndex": 1720,
            "startLine": 77,
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
          "severity": 3,
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
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample[39m[90m[24m:[39m
      [90m77|       allOf:[39m
      [90m78|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1712,
            "endLine": 76,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
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
          "codeFrame": "[90m74|       bearerFormat: JWT[39m
      [90m75|   parameters:[39m
      [90m76|     [4m[31mexample[39m[90m[24m:[39m
      [90m77|       allOf:[39m
      [90m78|         - name: bla[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 1712,
            "endLine": 76,
            "startCol": 5,
            "startIndex": 1705,
            "startLine": 76,
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
          "codeFrame": "[90m61|   description:[39m
      [90m62|     $ref: inc/docs-description.md[39m
      [90m63|   [4m[31murl: googlecom[39m[90m[24m[39m
      [90m64| components:[39m
      [90m65|   securitySchemes:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/external-docs",
          "location": Object {
            "endCol": 16,
            "endIndex": 1360,
            "endLine": 63,
            "startCol": 3,
            "startIndex": 1346,
            "startLine": 63,
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
            "description": "# Test markdown file

      This is a test markdown file.

      Include it in your OpenAPI definition description like this: 


          description:
            $ref: path/to/file.md
      ",
            "url": "googlecom",
          },
        },
      ]
    `);
  });
});

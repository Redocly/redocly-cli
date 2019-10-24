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
    expect(validateFromFile("./definitions/syntetic/to_bundle/main.yaml", {}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "codeFrame": "[90m09|       type: string[39m
      [90m10|     noRef:[39m
      [90m11|       [4m[31m$ref: 'bad.yaml#/does/not/exist'[90m[24m[39m",
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

  test("syntetic/syntetic-1.yaml", () => {
    expect(validateFromFile("./definitions/syntetic/syntetic-1.yaml", {}))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "codeFrame": "[90m34|     example:[39m
      [90m35|       allOf: las[39m
      [90m36| [4m[31mblabla[90m[24m: 313[39m
      [90m37| customerSupport:[39m
      [90m38|   id: 12[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 7,
            "endIndex": 683,
            "endLine": 36,
            "startCol": 1,
            "startIndex": 677,
            "startLine": 36,
          },
          "message": "The field 'blabla' is not allowed here. Use \\"x-\\" prefix to override this behavior.",
          "path": Array [
            "blabla",
          ],
          "pathStack": Array [],
          "possibleAlternate": null,
          "severity": 4,
          "target": "key",
          "value": Object {
            "blabla": 313,
            "components": Object {
              "parameters": Object {
                "example": Object {
                  "allOf": "las",
                },
              },
            },
            "customerSupport": Object {
              "contact": Object {
                "name": "Ivan Goncharov",
              },
              "id": 12,
            },
            "defaultParameterSchema": Object {
              "type": "string",
            },
            "info": Object {
              "contact": Object {
                "name": "John Doe",
              },
              "license": Object {
                "name": "example",
                "url": "example.org",
              },
              "title": "Example OpenAPI 3 definition. Valid.",
              "version": 1,
            },
            "openapi": "3.0.2",
            "paths": Object {
              "project": Object {
                "get": Object {
                  "responses": Object {
                    "200": Object {
                      "content": Object {
                        "application/json": Object {
                          "schema": Object {
                            "type": "object",
                          },
                        },
                      },
                      "description": "example description",
                    },
                  },
                },
              },
              "user": Object {
                "get": Object {
                  "responses": Object {
                    "200": Object {
                      "content": Object {
                        "application/json": Object {
                          "schema": Object {
                            "type": "object",
                          },
                        },
                      },
                      "description": "example description",
                    },
                  },
                },
                "parameters": Array [
                  Object {
                    "$ref": "#/components/parameters/example",
                  },
                ],
              },
            },
          },
        },
        Object {
          "codeFrame": "[90m35|       allOf: las[39m
      [90m36| blabla: 313[39m
      [90m37| [4m[31mcustomerSupport[90m[24m:[39m
      [90m38|   id: 12[39m
      [90m39|   contact:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 16,
            "endIndex": 704,
            "endLine": 37,
            "startCol": 1,
            "startIndex": 689,
            "startLine": 37,
          },
          "message": "The field 'customerSupport' is not allowed here. Use \\"x-\\" prefix to override this behavior.",
          "path": Array [
            "customerSupport",
          ],
          "pathStack": Array [],
          "possibleAlternate": null,
          "severity": 4,
          "target": "key",
          "value": Object {
            "blabla": 313,
            "components": Object {
              "parameters": Object {
                "example": Object {
                  "allOf": "las",
                },
              },
            },
            "customerSupport": Object {
              "contact": Object {
                "name": "Ivan Goncharov",
              },
              "id": 12,
            },
            "defaultParameterSchema": Object {
              "type": "string",
            },
            "info": Object {
              "contact": Object {
                "name": "John Doe",
              },
              "license": Object {
                "name": "example",
                "url": "example.org",
              },
              "title": "Example OpenAPI 3 definition. Valid.",
              "version": 1,
            },
            "openapi": "3.0.2",
            "paths": Object {
              "project": Object {
                "get": Object {
                  "responses": Object {
                    "200": Object {
                      "content": Object {
                        "application/json": Object {
                          "schema": Object {
                            "type": "object",
                          },
                        },
                      },
                      "description": "example description",
                    },
                  },
                },
              },
              "user": Object {
                "get": Object {
                  "responses": Object {
                    "200": Object {
                      "content": Object {
                        "application/json": Object {
                          "schema": Object {
                            "type": "object",
                          },
                        },
                      },
                      "description": "example description",
                    },
                  },
                },
                "parameters": Array [
                  Object {
                    "$ref": "#/components/parameters/example",
                  },
                ],
              },
            },
          },
        },
        Object {
          "codeFrame": "[90m39|   contact:[39m
      [90m40|     name: Ivan Goncharov[39m
      [90m41| [4m[31mdefaultParameterSchema[90m[24m:[39m
      [90m42|[39m[31m   type: string[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 23,
            "endIndex": 773,
            "endLine": 41,
            "startCol": 1,
            "startIndex": 751,
            "startLine": 41,
          },
          "message": "The field 'defaultParameterSchema' is not allowed here. Use \\"x-\\" prefix to override this behavior.",
          "path": Array [
            "defaultParameterSchema",
          ],
          "pathStack": Array [],
          "possibleAlternate": null,
          "severity": 4,
          "target": "key",
          "value": Object {
            "blabla": 313,
            "components": Object {
              "parameters": Object {
                "example": Object {
                  "allOf": "las",
                },
              },
            },
            "customerSupport": Object {
              "contact": Object {
                "name": "Ivan Goncharov",
              },
              "id": 12,
            },
            "defaultParameterSchema": Object {
              "type": "string",
            },
            "info": Object {
              "contact": Object {
                "name": "John Doe",
              },
              "license": Object {
                "name": "example",
                "url": "example.org",
              },
              "title": "Example OpenAPI 3 definition. Valid.",
              "version": 1,
            },
            "openapi": "3.0.2",
            "paths": Object {
              "project": Object {
                "get": Object {
                  "responses": Object {
                    "200": Object {
                      "content": Object {
                        "application/json": Object {
                          "schema": Object {
                            "type": "object",
                          },
                        },
                      },
                      "description": "example description",
                    },
                  },
                },
              },
              "user": Object {
                "get": Object {
                  "responses": Object {
                    "200": Object {
                      "content": Object {
                        "application/json": Object {
                          "schema": Object {
                            "type": "object",
                          },
                        },
                      },
                      "description": "example description",
                    },
                  },
                },
                "parameters": Array [
                  Object {
                    "$ref": "#/components/parameters/example",
                  },
                ],
              },
            },
          },
        },
        Object {
          "codeFrame": "[90m33|   parameters:[39m
      [90m34|     example:[39m
      [90m35|       [4m[31mallOf[90m[24m: las[39m
      [90m36| blabla: 313[39m
      [90m37| customerSupport:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 671,
            "endLine": 35,
            "startCol": 7,
            "startIndex": 666,
            "startLine": 35,
          },
          "message": "The field 'allOf' is not allowed here. Use \\"x-\\" prefix to override this behavior.",
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
              "startLine": 14,
            },
          ],
          "possibleAlternate": null,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": "las",
          },
        },
        Object {
          "codeFrame": "[90m32| components:[39m
      [90m33|   parameters:[39m
      [90m34|     [4m[31mexample[90m[24m:[39m
      [90m35|       allOf: las[39m
      [90m36| blabla: 313[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 658,
            "endLine": 34,
            "startCol": 5,
            "startIndex": 651,
            "startLine": 34,
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
              "startLine": 14,
            },
          ],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": "las",
          },
        },
        Object {
          "codeFrame": "[90m32| components:[39m
      [90m33|   parameters:[39m
      [90m34|     [4m[31mexample[90m[24m:[39m
      [90m35|       allOf: las[39m
      [90m36| blabla: 313[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 658,
            "endLine": 34,
            "startCol": 5,
            "startIndex": 651,
            "startLine": 34,
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
              "startLine": 14,
            },
          ],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "allOf": "las",
          },
        },
        Object {
          "codeFrame": "[90m33|   parameters:[39m
      [90m34|     example:[39m
      [90m35|       [4m[31mallOf[90m[24m: las[39m
      [90m36| blabla: 313[39m
      [90m37| customerSupport:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 12,
            "endIndex": 671,
            "endLine": 35,
            "startCol": 7,
            "startIndex": 666,
            "startLine": 35,
          },
          "message": "The field 'allOf' is not allowed here. Use \\"x-\\" prefix to override this behavior.",
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
            "allOf": "las",
          },
        },
        Object {
          "codeFrame": "[90m32| components:[39m
      [90m33|   parameters:[39m
      [90m34|     [4m[31mexample[90m[24m:[39m
      [90m35|       allOf: las[39m
      [90m36| blabla: 313[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 658,
            "endLine": 34,
            "startCol": 5,
            "startIndex": 651,
            "startLine": 34,
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
            "allOf": "las",
          },
        },
        Object {
          "codeFrame": "[90m32| components:[39m
      [90m33|   parameters:[39m
      [90m34|     [4m[31mexample[90m[24m:[39m
      [90m35|       allOf: las[39m
      [90m36| blabla: 313[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 12,
            "endIndex": 658,
            "endLine": 34,
            "startCol": 5,
            "startIndex": 651,
            "startLine": 34,
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
            "allOf": "las",
          },
        },
      ]
    `);
  });
});

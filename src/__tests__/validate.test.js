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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: string[39m
      [90m59|         - [4m[31mdescription: 12[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 25,
            "endIndex": 1308,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1293,
            "startLine": 59,
          },
          "message": "The field 'name' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            1,
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
            "description": 12,
          },
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: string[39m
      [90m59|         - [4m[31mdescription: 12[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 25,
            "endIndex": 1308,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1293,
            "startLine": 59,
          },
          "message": "The field 'in' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            1,
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
            "description": 12,
          },
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: string[39m
      [90m59|         - [4m[31mdescription[90m[24m: 12[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 22,
            "endIndex": 1304,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1293,
            "startLine": 59,
          },
          "message": "This field must be of string type.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            1,
            "description",
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
            "description": 12,
          },
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: string[39m
      [90m59|         - [4m[31mdescription: 12[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 25,
            "endIndex": 1308,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1293,
            "startLine": 59,
          },
          "message": "The field 'name' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            1,
            "name",
          ],
          "pathStack": Array [],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "description": 12,
          },
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: string[39m
      [90m59|         - [4m[31mdescription: 12[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 25,
            "endIndex": 1308,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1293,
            "startLine": 59,
          },
          "message": "The field 'in' must be present on this level.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            1,
            "in",
          ],
          "pathStack": Array [],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "description": 12,
          },
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: string[39m
      [90m59|         - [4m[31mdescription[90m[24m: 12[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 22,
            "endIndex": 1304,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1293,
            "startLine": 59,
          },
          "message": "This field must be of string type.",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            1,
            "description",
          ],
          "pathStack": Array [],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "key",
          "value": Object {
            "description": 12,
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
          "codeFrame": "[90m64|       schema:[39m
      [90m65|         type: string[39m
      [90m66| [4m[31mblabla[90m[24m: 313[39m
      [90m67| customerSupport:[39m
      [90m68|   id: 12[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 7,
            "endIndex": 1427,
            "endLine": 66,
            "startCol": 1,
            "startIndex": 1421,
            "startLine": 66,
          },
          "message": "The field 'blabla' is not allowed in OpenAPIRoot. Use \\"x-\\" prefix to override this behavior.",
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
                      "description": 12,
                    },
                  ],
                },
                "genericExample": Object {
                  "in": "query",
                  "name": "example",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                },
              },
              "securitySchemes": Object {
                "JWT": Object {
                  "bearerFormat": "JWT",
                  "description": "You can create a JSON Web Token (JWT) via our [JWT Session resource](https://rebilly.github.io/RebillyUserAPI/#tag/JWT-Session/paths/~1signin/post).
      Usage format: \`Bearer <JWT>\`
      ",
                  "scheme": "bearer",
                  "type": "http",
                },
              },
            },
            "customerSupport": Object {
              "contact": Object {
                "email": "ivan@redoc.ly",
                "name": "Ivan Goncharov",
              },
              "id": 12,
            },
            "defaultParameterSchema": Object {
              "type": "string",
            },
            "info": Object {
              "contact": Object {
                "email": "ivan@redoc.ly",
                "name": "Ivan Goncharov",
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
                  "description": "Get project",
                  "operationId": "projectGet",
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
                  "description": "Get user",
                  "operationId": "userGet",
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
            "servers": Array [
              Object {
                "url": "http://example.org",
              },
            ],
          },
        },
        Object {
          "codeFrame": "[90m65|         type: string[39m
      [90m66| blabla: 313[39m
      [90m67| [4m[31mcustomerSupport[90m[24m:[39m
      [90m68|   id: 12[39m
      [90m69|   contact:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 16,
            "endIndex": 1448,
            "endLine": 67,
            "startCol": 1,
            "startIndex": 1433,
            "startLine": 67,
          },
          "message": "The field 'customerSupport' is not allowed in OpenAPIRoot. Use \\"x-\\" prefix to override this behavior.",
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
                      "description": 12,
                    },
                  ],
                },
                "genericExample": Object {
                  "in": "query",
                  "name": "example",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                },
              },
              "securitySchemes": Object {
                "JWT": Object {
                  "bearerFormat": "JWT",
                  "description": "You can create a JSON Web Token (JWT) via our [JWT Session resource](https://rebilly.github.io/RebillyUserAPI/#tag/JWT-Session/paths/~1signin/post).
      Usage format: \`Bearer <JWT>\`
      ",
                  "scheme": "bearer",
                  "type": "http",
                },
              },
            },
            "customerSupport": Object {
              "contact": Object {
                "email": "ivan@redoc.ly",
                "name": "Ivan Goncharov",
              },
              "id": 12,
            },
            "defaultParameterSchema": Object {
              "type": "string",
            },
            "info": Object {
              "contact": Object {
                "email": "ivan@redoc.ly",
                "name": "Ivan Goncharov",
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
                  "description": "Get project",
                  "operationId": "projectGet",
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
                  "description": "Get user",
                  "operationId": "userGet",
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
            "servers": Array [
              Object {
                "url": "http://example.org",
              },
            ],
          },
        },
        Object {
          "codeFrame": "[90m70|     name: Ivan Goncharov[39m
      [90m71|     email: ivan@redoc.ly[39m
      [90m72| [4m[31mdefaultParameterSchema[90m[24m:[39m
      [90m73|[39m[31m   type: string[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/no-extra-fields",
          "location": Object {
            "endCol": 23,
            "endIndex": 1542,
            "endLine": 72,
            "startCol": 1,
            "startIndex": 1520,
            "startLine": 72,
          },
          "message": "The field 'defaultParameterSchema' is not allowed in OpenAPIRoot. Use \\"x-\\" prefix to override this behavior.",
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
                      "description": 12,
                    },
                  ],
                },
                "genericExample": Object {
                  "in": "query",
                  "name": "example",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                },
              },
              "securitySchemes": Object {
                "JWT": Object {
                  "bearerFormat": "JWT",
                  "description": "You can create a JSON Web Token (JWT) via our [JWT Session resource](https://rebilly.github.io/RebillyUserAPI/#tag/JWT-Session/paths/~1signin/post).
      Usage format: \`Bearer <JWT>\`
      ",
                  "scheme": "bearer",
                  "type": "http",
                },
              },
            },
            "customerSupport": Object {
              "contact": Object {
                "email": "ivan@redoc.ly",
                "name": "Ivan Goncharov",
              },
              "id": 12,
            },
            "defaultParameterSchema": Object {
              "type": "string",
            },
            "info": Object {
              "contact": Object {
                "email": "ivan@redoc.ly",
                "name": "Ivan Goncharov",
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
                  "description": "Get project",
                  "operationId": "projectGet",
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
                  "description": "Get user",
                  "operationId": "userGet",
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
            "servers": Array [
              Object {
                "url": "http://example.org",
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
                "description": 12,
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
                "description": 12,
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
                "description": 12,
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
                "description": 12,
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
                "description": 12,
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
                "description": 12,
              },
            ],
          },
        },
      ]
    `);
  });
});

import yaml from "js-yaml";
import fs from "fs";

import createError, { messageLevels, fromError } from "../default";

const createCtx = () => ({
  document: yaml.safeLoad(
    fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8")
  ),
  filePath: "./definitions/syntetic/syntetic-1.yaml",
  path: [],
  cache: {},
  visited: [],
  definitionStack: [],
  pathStack: [],
  source: fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8"),
  enableCodeframe: true
});

describe("createError", () => {
  test("should create valid error", () => {
    const ctx = {
      ...createCtx(),
      path: ["paths", "user", "get", "responses"]
    };
    expect(
      createError("This is a test error", {}, ctx, {
        severity: messageLevels.ERROR
      })
    ).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m22|       operationId: userGet[39m
      [90m23|       description: Get user[39m
      [90m24|       [4m[31mresponses:[90m[24m[39m
      [90m25|[39m[31m [4m[31m        '200':[31m[24m[39m
      [90m26|[39m[31m [4m[31m          description: example description[31m[24m[39m
      [90m27|[39m[31m [4m[31m          content:[31m[24m[39m
      [90m28|[39m[31m [4m[31m            application/json:[31m[24m[39m
      [90m29|[39m[31m [4m[31m              schema:[31m[24m[39m
      [90m30|[39m[31m [4m[31m                type: object[31m[24m[39m
      [90m31|   project:[39m
      [90m32|     get:[39m",
        "enableCodeframe": true,
        "file": "definitions/syntetic/syntetic-1.yaml",
        "fromRule": undefined,
        "location": Object {
          "endCol": 28,
          "endIndex": 600,
          "endLine": 30,
          "startCol": 7,
          "startIndex": 432,
          "startLine": 24,
        },
        "message": "This is a test error",
        "path": Array [
          "paths",
          "user",
          "get",
          "responses",
        ],
        "possibleAlternate": undefined,
        "referencedFrom": null,
        "severity": 4,
        "target": undefined,
        "value": Object {},
      }
    `);
  });

  test("should create error with alternative and from rule", () => {
    const ctx = {
      ...createCtx(),
      path: [],
      enableCodeframe: false
    };
    expect(
      createError("This is a test error", {}, ctx, {
        severity: messageLevels.ERROR,
        target: "key",
        possibleAlternate: "example",
        fromRule: "testing"
      })
    ).toMatchInlineSnapshot(`
      Object {
        "codeFrame": null,
        "enableCodeframe": false,
        "file": "definitions/syntetic/syntetic-1.yaml",
        "fromRule": "testing",
        "location": Object {
          "endCol": 14,
          "endIndex": 14,
          "endLine": 1,
          "startCol": 0,
          "startIndex": 0,
          "startLine": 1,
        },
        "message": "This is a test error",
        "path": Array [],
        "possibleAlternate": "example",
        "referencedFrom": null,
        "severity": 4,
        "target": "key",
        "value": Object {},
      }
    `);
  });
});

describe("fromError", () => {
  test("basic test", () => {
    const ctx = {
      ...createCtx(),
      path: ["paths", "user", "get", "responses"],
      pathStack: [
        {
          file: createCtx().filePath,
          path: ["paths", "user", "get", "responses"]
        }
      ]
    };

    ctx.pathStack[0].source = ctx.source;
    ctx.pathStack[0].document = ctx.document;

    const baseError = createError("This is a test error", {}, ctx, {
      severity: messageLevels.ERROR
    });
    ctx.path = ["paths", "project", "get", "responses"];
    expect(fromError(baseError, ctx)).toMatchInlineSnapshot(`
      Object {
        "cache": Object {},
        "codeFrame": "[90m22|       operationId: userGet[39m
      [90m23|       description: Get user[39m
      [90m24|       [4m[31mresponses:[90m[24m[39m
      [90m25|[39m[31m [4m[31m        '200':[31m[24m[39m
      [90m26|[39m[31m [4m[31m          description: example description[31m[24m[39m
      [90m27|[39m[31m [4m[31m          content:[31m[24m[39m
      [90m28|[39m[31m [4m[31m            application/json:[31m[24m[39m
      [90m29|[39m[31m [4m[31m              schema:[31m[24m[39m
      [90m30|[39m[31m [4m[31m                type: object[31m[24m[39m
      [90m31|   project:[39m
      [90m32|     get:[39m",
        "definitionStack": Array [],
        "document": null,
        "enableCodeframe": true,
        "file": "definitions/syntetic/syntetic-1.yaml",
        "filePath": "./definitions/syntetic/syntetic-1.yaml",
        "fromRule": undefined,
        "location": Object {
          "endCol": 28,
          "endIndex": 600,
          "endLine": 30,
          "startCol": 7,
          "startIndex": 432,
          "startLine": 24,
        },
        "message": "This is a test error",
        "path": Array [
          "paths",
          "user",
          "get",
          "responses",
        ],
        "pathStack": Array [
          Object {
            "document": Object {
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
                        "description": "blo",
                      },
                      Object {
                        "description": "bla",
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
              "externalDocs": Object {
                "description": Object {
                  "$ref": "inc/docs-description.md",
                },
                "url": "googlecom",
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
                "x-redocly-overlay": Object {
                  "path": "overlay-info.yaml",
                },
              },
              "openapi": "3.0.2",
              "paths": Object {
                "/user/{id}": Object {
                  "get": Object {
                    "description": "Get user by id",
                    "operationId": "withPathParam",
                    "parameters": Array [
                      Object {
                        "description": "User id",
                        "in": "path",
                        "name": "test",
                        "required": true,
                        "schema": Object {
                          "type": "string",
                        },
                      },
                    ],
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
            "file": "./definitions/syntetic/syntetic-1.yaml",
            "path": Array [
              "paths",
              "user",
              "get",
              "responses",
            ],
            "source": "openapi: 3.0.2
      info:
        x-redocly-overlay:
          path: overlay-info.yaml
        title: Example OpenAPI 3 definition. Valid.
        version: 1.0
        contact:
          name: Ivan Goncharov
          email: ivan@redoc.ly
        license:
          name: example
          url: example.org

      servers:
        - url: 'http://example.org'

      paths:
        user:
          parameters:
            - $ref: '#/components/parameters/example'
          get:
            operationId: userGet
            description: Get user
            responses:
              '200':
                description: example description
                content:
                  application/json:
                    schema:
                      type: object
        project:
          get:
            operationId: projectGet
            description: Get project
            responses:
              '200':
                description: example description
                content:
                  application/json:
                    schema:
                      type: object
        '/user/{id}':
          get:
            parameters:
              - in: path
                name: test
                description: User id
                required: true
                schema:
                  type: string
            operationId: withPathParam
            description: Get user by id
            responses:
              '200':
                description: example description
                content:
                  application/json:
                    schema:
                      type: object
      externalDocs:
        description:
          $ref: inc/docs-description.md
        url: googlecom
      components:
        securitySchemes:
          JWT:
            description: >
              You can create a JSON Web Token (JWT) via our [JWT Session
              resource](https://rebilly.github.io/RebillyUserAPI/#tag/JWT-Session/paths/~1signin/post).

              Usage format: \`Bearer <JWT>\`
            type: http
            scheme: bearer
            bearerFormat: JWT
        parameters:
          example:
            allOf:
              - name: bla
                in: query
                required: false
                schema:
                  type: string
              - description: blo
              - description: bla
          genericExample:
            name: example
            in: query
            required: true
            schema:
              type: string",
          },
        ],
        "possibleAlternate": undefined,
        "referencedFrom": Object {
          "file": "definitions/syntetic/syntetic-1.yaml",
          "path": Array [
            "paths",
            "user",
            "get",
            "responses",
          ],
          "startLine": 24,
        },
        "severity": 4,
        "source": null,
        "target": undefined,
        "value": Object {},
        "visited": Array [],
      }
    `);
  });
});

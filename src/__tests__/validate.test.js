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
          "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 20,
            "endIndex": 1214,
            "endLine": 55,
            "startCol": 11,
            "startIndex": 1204,
            "startLine": 55,
          },
          "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            0,
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
          "target": "value",
          "value": Object {
            "in": "querya",
            "name": "bla",
            "required": false,
            "schema": Object {
              "type": "stringa",
            },
          },
        },
        Object {
          "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/schema",
          "location": Object {
            "endCol": 25,
            "endIndex": 1284,
            "endLine": 58,
            "startCol": 13,
            "startIndex": 1271,
            "startLine": 58,
          },
          "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            0,
            "schema",
            "type",
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
          "possibleAlternate": "string",
          "severity": 4,
          "target": "value",
          "value": Object {
            "type": "stringa",
          },
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 39,
            "endIndex": 1324,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1295,
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
            "description": "Concrete example",
          },
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 39,
            "endIndex": 1324,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1295,
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
            "description": "Concrete example",
          },
        },
        Object {
          "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 20,
            "endIndex": 1214,
            "endLine": 55,
            "startCol": 11,
            "startIndex": 1204,
            "startLine": 55,
          },
          "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            0,
            "in",
          ],
          "pathStack": Array [],
          "possibleAlternate": undefined,
          "severity": 4,
          "target": "value",
          "value": Object {
            "in": "querya",
            "name": "bla",
            "required": false,
            "schema": Object {
              "type": "stringa",
            },
          },
        },
        Object {
          "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/schema",
          "location": Object {
            "endCol": 25,
            "endIndex": 1284,
            "endLine": 58,
            "startCol": 13,
            "startIndex": 1271,
            "startLine": 58,
          },
          "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            0,
            "schema",
            "type",
          ],
          "pathStack": Array [],
          "possibleAlternate": "string",
          "severity": 4,
          "target": "value",
          "value": Object {
            "type": "stringa",
          },
        },
        Object {
          "AST": null,
          "cache": Object {
            "definitions/syntetic/syntetic-1.yaml::": Array [
              Object {
                "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 20,
                  "endIndex": 1214,
                  "endLine": 55,
                  "startCol": 11,
                  "startIndex": 1204,
                  "startLine": 55,
                },
                "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
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
                "target": "value",
                "value": Object {
                  "in": "querya",
                  "name": "bla",
                  "required": false,
                  "schema": Object {
                    "type": "stringa",
                  },
                },
              },
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
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
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 20,
                  "endIndex": 1214,
                  "endLine": 55,
                  "startCol": 11,
                  "startIndex": 1204,
                  "startLine": 55,
                },
                "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "in",
                ],
                "pathStack": Array [],
                "possibleAlternate": undefined,
                "severity": 4,
                "target": "value",
                "value": Object {
                  "in": "querya",
                  "name": "bla",
                  "required": false,
                  "schema": Object {
                    "type": "stringa",
                  },
                },
              },
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
                ],
                "pathStack": Array [],
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::components": Array [
              Object {
                "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 20,
                  "endIndex": 1214,
                  "endLine": 55,
                  "startCol": 11,
                  "startIndex": 1204,
                  "startLine": 55,
                },
                "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "in",
                ],
                "pathStack": Array [],
                "possibleAlternate": undefined,
                "severity": 4,
                "target": "value",
                "value": Object {
                  "in": "querya",
                  "name": "bla",
                  "required": false,
                  "schema": Object {
                    "type": "stringa",
                  },
                },
              },
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
                ],
                "pathStack": Array [],
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::components/parameters": Array [
              Object {
                "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 20,
                  "endIndex": 1214,
                  "endLine": 55,
                  "startCol": 11,
                  "startIndex": 1204,
                  "startLine": 55,
                },
                "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "in",
                ],
                "pathStack": Array [],
                "possibleAlternate": undefined,
                "severity": 4,
                "target": "value",
                "value": Object {
                  "in": "querya",
                  "name": "bla",
                  "required": false,
                  "schema": Object {
                    "type": "stringa",
                  },
                },
              },
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
                ],
                "pathStack": Array [],
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::components/parameters/example": Array [
              Object {
                "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 20,
                  "endIndex": 1214,
                  "endLine": 55,
                  "startCol": 11,
                  "startIndex": 1204,
                  "startLine": 55,
                },
                "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "in",
                ],
                "pathStack": Array [],
                "possibleAlternate": undefined,
                "severity": 4,
                "target": "value",
                "value": Object {
                  "in": "querya",
                  "name": "bla",
                  "required": false,
                  "schema": Object {
                    "type": "stringa",
                  },
                },
              },
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
                ],
                "pathStack": Array [],
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::components/parameters/example/allOf/0": Array [
              Object {
                "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 20,
                  "endIndex": 1214,
                  "endLine": 55,
                  "startCol": 11,
                  "startIndex": 1204,
                  "startLine": 55,
                },
                "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "in",
                ],
                "pathStack": Array [],
                "possibleAlternate": undefined,
                "severity": 4,
                "target": "value",
                "value": Object {
                  "in": "querya",
                  "name": "bla",
                  "required": false,
                  "schema": Object {
                    "type": "stringa",
                  },
                },
              },
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
                ],
                "pathStack": Array [],
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::components/parameters/example/allOf/0/schema": Array [
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
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
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::components/parameters/example/allOf/1": Array [
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::components/parameters/genericExample": Array [],
            "definitions/syntetic/syntetic-1.yaml::components/parameters/genericExample/schema": Array [],
            "definitions/syntetic/syntetic-1.yaml::components/securitySchemes": Array [],
            "definitions/syntetic/syntetic-1.yaml::components/securitySchemes/JWT": Array [],
            "definitions/syntetic/syntetic-1.yaml::customerSupport": Array [],
            "definitions/syntetic/syntetic-1.yaml::customerSupport/contact": Array [],
            "definitions/syntetic/syntetic-1.yaml::defaultParameterSchema": Array [],
            "definitions/syntetic/syntetic-1.yaml::info": Array [],
            "definitions/syntetic/syntetic-1.yaml::info/contact": Array [],
            "definitions/syntetic/syntetic-1.yaml::info/license": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths": Array [
              Object {
                "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 20,
                  "endIndex": 1214,
                  "endLine": 55,
                  "startCol": 11,
                  "startIndex": 1204,
                  "startLine": 55,
                },
                "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
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
                "target": "value",
                "value": Object {
                  "in": "querya",
                  "name": "bla",
                  "required": false,
                  "schema": Object {
                    "type": "stringa",
                  },
                },
              },
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
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
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::paths/project": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/project/get": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses/200": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses/200/content": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses/200/content/application/json": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses/200/content/application/json/schema": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/user": Array [
              Object {
                "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 20,
                  "endIndex": 1214,
                  "endLine": 55,
                  "startCol": 11,
                  "startIndex": 1204,
                  "startLine": 55,
                },
                "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
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
                "target": "value",
                "value": Object {
                  "in": "querya",
                  "name": "bla",
                  "required": false,
                  "schema": Object {
                    "type": "stringa",
                  },
                },
              },
              Object {
                "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/schema",
                "location": Object {
                  "endCol": 25,
                  "endIndex": 1284,
                  "endLine": 58,
                  "startCol": 13,
                  "startIndex": 1271,
                  "startLine": 58,
                },
                "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
                "path": Array [
                  "components",
                  "parameters",
                  "example",
                  "allOf",
                  0,
                  "schema",
                  "type",
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
                "possibleAlternate": "string",
                "severity": 4,
                "target": "value",
                "value": Object {
                  "type": "stringa",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
              Object {
                "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
                "enableCodeframe": true,
                "file": "definitions/syntetic/syntetic-1.yaml",
                "fromRule": "oas3-schema/parameter",
                "location": Object {
                  "endCol": 39,
                  "endIndex": 1324,
                  "endLine": 59,
                  "startCol": 11,
                  "startIndex": 1295,
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
                  "description": "Concrete example",
                },
              },
            ],
            "definitions/syntetic/syntetic-1.yaml::paths/user/get": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses/200": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses/200/content": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses/200/content/application/json": Array [],
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses/200/content/application/json/schema": Array [],
            "definitions/syntetic/syntetic-1.yaml::servers/0": Array [],
          },
          "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
          "config": Object {
            "codeframes": "on",
            "definitionResolver": [Function],
            "rules": Object {
              "api-servers": "off",
              "bundler": "off",
              "camel-case-names": "off",
              "debug-info": "off",
              "license-url": "off",
              "no-extra-fields": "off",
              "no-unused-schemas": "on",
              "oas3-schema": "on",
              "operation-2xx-response": "on",
              "operation-description": "off",
              "operation-operationId": "off",
              "operation-operationId-unique": "on",
              "operation-tags": "off",
              "path-declarations-must-exist": "on",
              "path-param-exists": "on",
              "provide-contact": "off",
              "servers-no-trailing-slash": "off",
              "suggest-possible-refs": "on",
              "unique-parameter-names": "on",
            },
            "rulesRedefine": "./definitions/rulesRedefine.js",
            "typeExtension": "/Users/knidarkness/work/redoc.ly/openapi-cli/./definitions/typeExtension.js",
            "validatorsExtensions": "/Users/knidarkness/work/redoc.ly/openapi-cli/src/validatorsMidldewareDefault.js",
            "validatorsMidldeware": [Function],
          },
          "customRules": Array [
            CheckPathParamExists {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            NoUnusedComponents {
              "components": Object {},
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            Operation2xxResponse {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
              "responseCodes": Array [],
            },
            OperationIdUnique {
              "config": Object {
                "level": 4,
              },
              "operationIds": Object {
                "projectGet": 1,
                "userGet": 1,
              },
            },
            PathDeclarationsMustExist {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            SuggestPossibleRefs {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            UniqueParameterNames {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
              "parametersStack": Array [],
            },
            NoExtraFields {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            NoRefSiblings {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateAuthorizationCodeOpenAPIFlow {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateClientCredentialsOpenAPIFlow {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateImplicitOpenAPIFlow {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIContact {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIDiscriminator {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIEncoding {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIExample {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIExternalDocumentation {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIHeader {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIInfo {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPILicense {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIMediaObject {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIOperation {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIParameter {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIPath {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIRequestBody {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIResponse {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIRoot {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPISchema {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPISecuritySchema {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIServer {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIServerVariable {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPITag {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidateOpenAPIXML {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
            ValidatePasswordOpenAPIFlow {
              "config": Object {
                "0": "o",
                "1": "n",
                "level": 4,
              },
            },
          ],
          "definitionStack": Array [],
          "document": null,
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "filePath": "/Users/knidarkness/work/redoc.ly/openapi-cli/definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/schema",
          "location": Object {
            "endCol": 25,
            "endIndex": 1284,
            "endLine": 58,
            "startCol": 13,
            "startIndex": 1271,
            "startLine": 58,
          },
          "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
          "path": Array [
            "components",
            "parameters",
            "example",
            "allOf",
            0,
            "schema",
            "type",
          ],
          "pathStack": Array [],
          "possibleAlternate": "string",
          "result": Array [
            Object {
              "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
              "enableCodeframe": true,
              "file": "definitions/syntetic/syntetic-1.yaml",
              "fromRule": "oas3-schema/parameter",
              "location": Object {
                "endCol": 20,
                "endIndex": 1214,
                "endLine": 55,
                "startCol": 11,
                "startIndex": 1204,
                "startLine": 55,
              },
              "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
              "path": Array [
                "components",
                "parameters",
                "example",
                "allOf",
                0,
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
              "target": "value",
              "value": Object {
                "in": "querya",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "stringa",
                },
              },
            },
            Object {
              "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
              "enableCodeframe": true,
              "file": "definitions/syntetic/syntetic-1.yaml",
              "fromRule": "oas3-schema/schema",
              "location": Object {
                "endCol": 25,
                "endIndex": 1284,
                "endLine": 58,
                "startCol": 13,
                "startIndex": 1271,
                "startLine": 58,
              },
              "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
              "path": Array [
                "components",
                "parameters",
                "example",
                "allOf",
                0,
                "schema",
                "type",
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
              "possibleAlternate": "string",
              "severity": 4,
              "target": "value",
              "value": Object {
                "type": "stringa",
              },
            },
            Object {
              "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
              "enableCodeframe": true,
              "file": "definitions/syntetic/syntetic-1.yaml",
              "fromRule": "oas3-schema/parameter",
              "location": Object {
                "endCol": 39,
                "endIndex": 1324,
                "endLine": 59,
                "startCol": 11,
                "startIndex": 1295,
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
                "description": "Concrete example",
              },
            },
            Object {
              "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
              "enableCodeframe": true,
              "file": "definitions/syntetic/syntetic-1.yaml",
              "fromRule": "oas3-schema/parameter",
              "location": Object {
                "endCol": 39,
                "endIndex": 1324,
                "endLine": 59,
                "startCol": 11,
                "startIndex": 1295,
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
                "description": "Concrete example",
              },
            },
            Object {
              "codeFrame": "[90m53|       allOf:[39m
      [90m54|         - name: bla[39m
      [90m55|           [4m[31min: querya[90m[24m[39m
      [90m56|           required: false[39m
      [90m57|           schema:[39m",
              "enableCodeframe": true,
              "file": "definitions/syntetic/syntetic-1.yaml",
              "fromRule": "oas3-schema/parameter",
              "location": Object {
                "endCol": 20,
                "endIndex": 1214,
                "endLine": 55,
                "startCol": 11,
                "startIndex": 1204,
                "startLine": 55,
              },
              "message": "The 'in' field value can be only one of: 'query', 'header', 'path', 'cookie'",
              "path": Array [
                "components",
                "parameters",
                "example",
                "allOf",
                0,
                "in",
              ],
              "pathStack": Array [],
              "possibleAlternate": undefined,
              "severity": 4,
              "target": "value",
              "value": Object {
                "in": "querya",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "stringa",
                },
              },
            },
            Object {
              "codeFrame": "[90m56|           required: false[39m
      [90m57|           schema:[39m
      [90m58|             [4m[31mtype: stringa[90m[24m[39m
      [90m59|         - description: Concrete example[39m
      [90m60|     genericExample:[39m",
              "enableCodeframe": true,
              "file": "definitions/syntetic/syntetic-1.yaml",
              "fromRule": "oas3-schema/schema",
              "location": Object {
                "endCol": 25,
                "endIndex": 1284,
                "endLine": 58,
                "startCol": 13,
                "startIndex": 1271,
                "startLine": 58,
              },
              "message": "Object type can be one of following only: \\"string\\", \\"object\\", \\"array\\", \\"integer\\", \\"number\\", \\"boolean\\".",
              "path": Array [
                "components",
                "parameters",
                "example",
                "allOf",
                0,
                "schema",
                "type",
              ],
              "pathStack": Array [],
              "possibleAlternate": "string",
              "severity": 4,
              "target": "value",
              "value": Object {
                "type": "stringa",
              },
            },
            [Circular],
            Object {
              "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
              "enableCodeframe": true,
              "file": "definitions/syntetic/syntetic-1.yaml",
              "fromRule": "oas3-schema/parameter",
              "location": Object {
                "endCol": 39,
                "endIndex": 1324,
                "endLine": 59,
                "startCol": 11,
                "startIndex": 1295,
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
                "description": "Concrete example",
              },
            },
            Object {
              "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
              "enableCodeframe": true,
              "file": "definitions/syntetic/syntetic-1.yaml",
              "fromRule": "oas3-schema/parameter",
              "location": Object {
                "endCol": 39,
                "endIndex": 1324,
                "endLine": 59,
                "startCol": 11,
                "startIndex": 1295,
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
                "description": "Concrete example",
              },
            },
          ],
          "severity": 4,
          "source": null,
          "target": "value",
          "value": Object {
            "type": "stringa",
          },
          "visited": Array [
            "definitions/syntetic/syntetic-1.yaml::",
            "definitions/syntetic/syntetic-1.yaml::info",
            "definitions/syntetic/syntetic-1.yaml::info/license",
            "definitions/syntetic/syntetic-1.yaml::info/contact",
            "definitions/syntetic/syntetic-1.yaml::paths",
            "definitions/syntetic/syntetic-1.yaml::paths/user",
            "definitions/syntetic/syntetic-1.yaml::components/parameters/example",
            "definitions/syntetic/syntetic-1.yaml::components/parameters/example/allOf/0",
            "definitions/syntetic/syntetic-1.yaml::components/parameters/example/allOf/0/schema",
            "definitions/syntetic/syntetic-1.yaml::components/parameters/example/allOf/1",
            "definitions/syntetic/syntetic-1.yaml::paths/user/get",
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses",
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses/200",
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses/200/content",
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses/200/content/application/json",
            "definitions/syntetic/syntetic-1.yaml::paths/user/get/responses/200/content/application/json/schema",
            "definitions/syntetic/syntetic-1.yaml::paths/project",
            "definitions/syntetic/syntetic-1.yaml::paths/project/get",
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses",
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses/200",
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses/200/content",
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses/200/content/application/json",
            "definitions/syntetic/syntetic-1.yaml::paths/project/get/responses/200/content/application/json/schema",
            "definitions/syntetic/syntetic-1.yaml::servers/0",
            "definitions/syntetic/syntetic-1.yaml::components",
            "definitions/syntetic/syntetic-1.yaml::components/parameters",
            "definitions/syntetic/syntetic-1.yaml::components/parameters/genericExample",
            "definitions/syntetic/syntetic-1.yaml::components/parameters/genericExample/schema",
            "definitions/syntetic/syntetic-1.yaml::components/securitySchemes",
            "definitions/syntetic/syntetic-1.yaml::components/securitySchemes/JWT",
            "definitions/syntetic/syntetic-1.yaml::defaultParameterSchema",
            "definitions/syntetic/syntetic-1.yaml::customerSupport",
            "definitions/syntetic/syntetic-1.yaml::customerSupport/contact",
          ],
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 39,
            "endIndex": 1324,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1295,
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
            "description": "Concrete example",
          },
        },
        Object {
          "codeFrame": "[90m57|           schema:[39m
      [90m58|             type: stringa[39m
      [90m59|         - [4m[31mdescription: Concrete example[90m[24m[39m
      [90m60|     genericExample:[39m
      [90m61|       name: example[39m",
          "enableCodeframe": true,
          "file": "definitions/syntetic/syntetic-1.yaml",
          "fromRule": "oas3-schema/parameter",
          "location": Object {
            "endCol": 39,
            "endIndex": 1324,
            "endLine": 59,
            "startCol": 11,
            "startIndex": 1295,
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
            "description": "Concrete example",
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
            "endIndex": 1443,
            "endLine": 66,
            "startCol": 1,
            "startIndex": 1437,
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
                      "in": "querya",
                      "name": "bla",
                      "required": false,
                      "schema": Object {
                        "type": "stringa",
                      },
                    },
                    Object {
                      "description": "Concrete example",
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
            "endIndex": 1464,
            "endLine": 67,
            "startCol": 1,
            "startIndex": 1449,
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
                      "in": "querya",
                      "name": "bla",
                      "required": false,
                      "schema": Object {
                        "type": "stringa",
                      },
                    },
                    Object {
                      "description": "Concrete example",
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
            "endIndex": 1558,
            "endLine": 72,
            "startCol": 1,
            "startIndex": 1536,
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
                      "in": "querya",
                      "name": "bla",
                      "required": false,
                      "schema": Object {
                        "type": "stringa",
                      },
                    },
                    Object {
                      "description": "Concrete example",
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
      [90m55|           in: querya[39m",
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
                "in": "querya",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "stringa",
                },
              },
              Object {
                "description": "Concrete example",
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
                "in": "querya",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "stringa",
                },
              },
              Object {
                "description": "Concrete example",
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
                "in": "querya",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "stringa",
                },
              },
              Object {
                "description": "Concrete example",
              },
            ],
          },
        },
        Object {
          "codeFrame": "[90m51|   parameters:[39m
      [90m52|     example:[39m
      [90m53|       [4m[31mallOf[90m[24m:[39m
      [90m54|         - name: bla[39m
      [90m55|           in: querya[39m",
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
                "in": "querya",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "stringa",
                },
              },
              Object {
                "description": "Concrete example",
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
                "in": "querya",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "stringa",
                },
              },
              Object {
                "description": "Concrete example",
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
                "in": "querya",
                "name": "bla",
                "required": false,
                "schema": Object {
                  "type": "stringa",
                },
              },
              Object {
                "description": "Concrete example",
              },
            ],
          },
        },
      ]
    `);
  });
});

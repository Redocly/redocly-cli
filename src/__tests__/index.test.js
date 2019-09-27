import { validateFromFile } from "../index";

test("validate simple document", () => {
  expect(validateFromFile("./test/specs/openapi/simple.yaml"))
    .toMatchInlineSnapshot(`
    Array [
      Object {
        "codeFrame": null,
        "file": "./test/specs/openapi/simple.yaml",
        "location": Object {
          "endCol": 17,
          "endIndex": 86,
          "endLine": 6,
          "startCol": 0,
          "startIndex": 0,
          "startLine": 1,
        },
        "message": "The field 'paths' must be present on this level.",
        "path": "",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "info": Object {
            "license": Object {
              "name": "Test license",
            },
            "taitle": 123,
            "version": "0.0.1",
          },
          "openapi": "3.0.1",
        },
      },
      Object {
        "codeFrame": null,
        "file": "./test/specs/openapi/simple.yaml",
        "location": Object {
          "endCol": 9,
          "endIndex": 29,
          "endLine": 3,
          "startCol": 3,
          "startIndex": 23,
          "startLine": 3,
        },
        "message": "The field 'taitle' is not allowed here. Use \\"x-\\" prefix to override this behavior.",
        "path": "[90minfo[39m[90m/[39m[90mtaitle[39m",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "license": Object {
            "name": "Test license",
          },
          "taitle": 123,
          "version": "0.0.1",
        },
      },
      Object {
        "codeFrame": null,
        "file": "./test/specs/openapi/simple.yaml",
        "location": Object {
          "endCol": 5,
          "endIndex": 19,
          "endLine": 2,
          "startCol": 1,
          "startIndex": 15,
          "startLine": 2,
        },
        "message": "The field 'title' must be present on this level.",
        "path": "[90minfo[39m",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "license": Object {
            "name": "Test license",
          },
          "taitle": 123,
          "version": "0.0.1",
        },
      },
    ]
  `);
});

test("Validate simple valid OpenAPI document", () => {
  expect(validateFromFile("./test/specs/openapi/test-2.yaml"))
    .toMatchInlineSnapshot(`
    Array [
      Object {
        "codeFrame": null,
        "file": "./test/specs/openapi/operations/test/operation-2.yaml",
        "location": Object {
          "endCol": 17,
          "endIndex": 130,
          "endLine": 7,
          "startCol": 3,
          "startIndex": 115,
          "startLine": 7,
        },
        "message": "url must be a valid URL",
        "path": "[90mexternalDocs[39m[90m/[39m[90murl[39m",
        "pathStack": Array [
          "[94m./test/specs/openapi/test-2.yaml:12[39m [90m#/paths//user/{userId}/get[39m",
        ],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "url": "googleacom",
        },
      },
      Object {
        "codeFrame": null,
        "file": "./test/specs/openapi/operations/test/../../test-2.yaml",
        "location": Object {
          "endCol": 14,
          "endIndex": 873,
          "endLine": 43,
          "startCol": 13,
          "startIndex": 871,
          "startLine": 43,
        },
        "message": "All values of \\"enum\\" field must be of the same type as the \\"type\\" field",
        "path": "[90mcomponents[39m[90m/[39m[90mschemas[39m[90m/[39m[90mPet[39m[90m/[39m[90mproperties[39m[90m/[39m[90mstatus[39m[90m/[39m[90menum[39m[90m/[39m[90m2[39m",
        "pathStack": Array [
          "[94m./test/specs/openapi/test-2.yaml:12[39m [90m#/paths//user/{userId}/get[39m",
          "[94m./test/specs/openapi/operations/test/operation-2.yaml:46[39m [90m#/responses/200/content/application/json/schema[39m",
          "[94m./test/specs/openapi/operations/test/../../test-2.yaml:72[39m [90m#/components/schemas/user/properties/pet[39m",
        ],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "description": "pet status in the store",
          "enum": Array [
            "available",
            "pending",
            12,
          ],
          "type": "string",
        },
      },
      Object {
        "codeFrame": null,
        "file": "./test/specs/openapi/operations/test/operation.yaml",
        "location": Object {
          "endCol": 15,
          "endIndex": 128,
          "endLine": 7,
          "startCol": 3,
          "startIndex": 115,
          "startLine": 7,
        },
        "message": "url must be a valid URL",
        "path": "[90mexternalDocs[39m[90m/[39m[90murl[39m",
        "pathStack": Array [
          "[94m./test/specs/openapi/test-2.yaml:10[39m [90m#/paths//user/{userId}/post[39m",
        ],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "url": "asdasdas",
        },
      },
      Object {
        "codeFrame": null,
        "file": "./test/specs/openapi/test-2.yaml",
        "location": Object {
          "endCol": 14,
          "endIndex": 873,
          "endLine": 43,
          "startCol": 13,
          "startIndex": 871,
          "startLine": 43,
        },
        "message": "All values of \\"enum\\" field must be of the same type as the \\"type\\" field",
        "path": "[90mcomponents[39m[90m/[39m[90mschemas[39m[90m/[39m[90mPet[39m[90m/[39m[90mproperties[39m[90m/[39m[90mstatus[39m[90m/[39m[90menum[39m[90m/[39m[90m2[39m",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "description": "pet status in the store",
          "enum": Array [
            "available",
            "pending",
            12,
          ],
          "type": "string",
        },
      },
    ]
  `);
});

test("Validate from invalid file", () => {
  expect(() => {
    validateFromFile("./test/specs/openapi/test-invalid-1.yaml");
  }).toThrowErrorMatchingInlineSnapshot('"Can\'t load yaml file"');
});

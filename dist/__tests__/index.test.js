"use strict";

var _index = require("../index");

test("validate simple document", () => {
  expect((0, _index.validateFromFile)("./test/specs/openapi/simple.yaml")).toMatchInlineSnapshot(`
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
  expect((0, _index.validateFromFile)("./test/specs/openapi/test-2.yaml")).toMatchInlineSnapshot(`
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
    (0, _index.validateFromFile)("./test/specs/openapi/test-invalid-1.yaml");
  }).toThrowErrorMatchingInlineSnapshot('"Can\'t load yaml file"');
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9fX3Rlc3RzX18vaW5kZXgudGVzdC5qcyJdLCJuYW1lcyI6WyJ0ZXN0IiwiZXhwZWN0IiwidG9NYXRjaElubGluZVNuYXBzaG90IiwidG9UaHJvd0Vycm9yTWF0Y2hpbmdJbmxpbmVTbmFwc2hvdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFFQUEsSUFBSSxDQUFDLDBCQUFELEVBQTZCLE1BQU07QUFDckNDLEVBQUFBLE1BQU0sQ0FBQyw2QkFBaUIsa0NBQWpCLENBQUQsQ0FBTixDQUNHQyxxQkFESCxDQUMwQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBRDFCO0FBZ0ZELENBakZHLENBQUo7QUFtRkFGLElBQUksQ0FBQyx3Q0FBRCxFQUEyQyxNQUFNO0FBQ25EQyxFQUFBQSxNQUFNLENBQUMsNkJBQWlCLGtDQUFqQixDQUFELENBQU4sQ0FDR0MscUJBREgsQ0FDMEI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FEMUI7QUF5R0QsQ0ExR0csQ0FBSjtBQTRHQUYsSUFBSSxDQUFDLDRCQUFELEVBQStCLE1BQU07QUFDdkNDLEVBQUFBLE1BQU0sQ0FBQyxNQUFNO0FBQ1gsaUNBQWlCLDBDQUFqQjtBQUNELEdBRkssQ0FBTixDQUVHRSxrQ0FGSCxDQUVzQyx5QkFGdEM7QUFHRCxDQUpHLENBQUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2YWxpZGF0ZUZyb21GaWxlIH0gZnJvbSBcIi4uL2luZGV4XCI7XG5cbnRlc3QoXCJ2YWxpZGF0ZSBzaW1wbGUgZG9jdW1lbnRcIiwgKCkgPT4ge1xuICBleHBlY3QodmFsaWRhdGVGcm9tRmlsZShcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3NpbXBsZS55YW1sXCIpKVxuICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgIEFycmF5IFtcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IG51bGwsXG4gICAgICAgIFwiZmlsZVwiOiBcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3NpbXBsZS55YW1sXCIsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAxNyxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDg2LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiA2LFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogMCxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMCxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAxLFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGUgZmllbGQgJ3BhdGhzJyBtdXN0IGJlIHByZXNlbnQgb24gdGhpcyBsZXZlbC5cIixcbiAgICAgICAgXCJwYXRoXCI6IFwiXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJpbmZvXCI6IE9iamVjdCB7XG4gICAgICAgICAgICBcImxpY2Vuc2VcIjogT2JqZWN0IHtcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVzdCBsaWNlbnNlXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ0YWl0bGVcIjogMTIzLFxuICAgICAgICAgICAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjFcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwib3BlbmFwaVwiOiBcIjMuMC4xXCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgT2JqZWN0IHtcbiAgICAgICAgXCJjb2RlRnJhbWVcIjogbnVsbCxcbiAgICAgICAgXCJmaWxlXCI6IFwiLi90ZXN0L3NwZWNzL29wZW5hcGkvc2ltcGxlLnlhbWxcIixcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDksXG4gICAgICAgICAgXCJlbmRJbmRleFwiOiAyOSxcbiAgICAgICAgICBcImVuZExpbmVcIjogMyxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDMsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDIzLFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDMsXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcIlRoZSBmaWVsZCAndGFpdGxlJyBpcyBub3QgYWxsb3dlZCBoZXJlLiBVc2UgXFxcXFwieC1cXFxcXCIgcHJlZml4IHRvIG92ZXJyaWRlIHRoaXMgYmVoYXZpb3IuXCIsXG4gICAgICAgIFwicGF0aFwiOiBcIlx1MDAxYls5MG1pbmZvXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG10YWl0bGVcdTAwMWJbMzltXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJsaWNlbnNlXCI6IE9iamVjdCB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJUZXN0IGxpY2Vuc2VcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidGFpdGxlXCI6IDEyMyxcbiAgICAgICAgICBcInZlcnNpb25cIjogXCIwLjAuMVwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IG51bGwsXG4gICAgICAgIFwiZmlsZVwiOiBcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3NpbXBsZS55YW1sXCIsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiA1LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMTksXG4gICAgICAgICAgXCJlbmRMaW5lXCI6IDIsXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAxNSxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAyLFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGUgZmllbGQgJ3RpdGxlJyBtdXN0IGJlIHByZXNlbnQgb24gdGhpcyBsZXZlbC5cIixcbiAgICAgICAgXCJwYXRoXCI6IFwiXHUwMDFiWzkwbWluZm9cdTAwMWJbMzltXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJsaWNlbnNlXCI6IE9iamVjdCB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJUZXN0IGxpY2Vuc2VcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidGFpdGxlXCI6IDEyMyxcbiAgICAgICAgICBcInZlcnNpb25cIjogXCIwLjAuMVwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICBdXG4gIGApO1xufSk7XG5cbnRlc3QoXCJWYWxpZGF0ZSBzaW1wbGUgdmFsaWQgT3BlbkFQSSBkb2N1bWVudFwiLCAoKSA9PiB7XG4gIGV4cGVjdCh2YWxpZGF0ZUZyb21GaWxlKFwiLi90ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0yLnlhbWxcIikpXG4gICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgQXJyYXkgW1xuICAgICAgT2JqZWN0IHtcbiAgICAgICAgXCJjb2RlRnJhbWVcIjogbnVsbCxcbiAgICAgICAgXCJmaWxlXCI6IFwiLi90ZXN0L3NwZWNzL29wZW5hcGkvb3BlcmF0aW9ucy90ZXN0L29wZXJhdGlvbi0yLnlhbWxcIixcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE3LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMTMwLFxuICAgICAgICAgIFwiZW5kTGluZVwiOiA3LFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogMyxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMTE1LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDcsXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcInVybCBtdXN0IGJlIGEgdmFsaWQgVVJMXCIsXG4gICAgICAgIFwicGF0aFwiOiBcIlx1MDAxYls5MG1leHRlcm5hbERvY3NcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXVybFx1MDAxYlszOW1cIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW1xuICAgICAgICAgIFwiXHUwMDFiWzk0bS4vdGVzdC9zcGVjcy9vcGVuYXBpL3Rlc3QtMi55YW1sOjEyXHUwMDFiWzM5bSBcdTAwMWJbOTBtIy9wYXRocy8vdXNlci97dXNlcklkfS9nZXRcdTAwMWJbMzltXCIsXG4gICAgICAgIF0sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcInVybFwiOiBcImdvb2dsZWFjb21cIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBudWxsLFxuICAgICAgICBcImZpbGVcIjogXCIuL3Rlc3Qvc3BlY3Mvb3BlbmFwaS9vcGVyYXRpb25zL3Rlc3QvLi4vLi4vdGVzdC0yLnlhbWxcIixcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE0LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogODczLFxuICAgICAgICAgIFwiZW5kTGluZVwiOiA0MyxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDEzLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiA4NzEsXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogNDMsXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcIkFsbCB2YWx1ZXMgb2YgXFxcXFwiZW51bVxcXFxcIiBmaWVsZCBtdXN0IGJlIG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlIFxcXFxcInR5cGVcXFxcXCIgZmllbGRcIixcbiAgICAgICAgXCJwYXRoXCI6IFwiXHUwMDFiWzkwbWNvbXBvbmVudHNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXNjaGVtYXNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbVBldFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcHJvcGVydGllc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtc3RhdHVzXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1lbnVtXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG0yXHUwMDFiWzM5bVwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXG4gICAgICAgICAgXCJcdTAwMWJbOTRtLi90ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0yLnlhbWw6MTJcdTAwMWJbMzltIFx1MDAxYls5MG0jL3BhdGhzLy91c2VyL3t1c2VySWR9L2dldFx1MDAxYlszOW1cIixcbiAgICAgICAgICBcIlx1MDAxYls5NG0uL3Rlc3Qvc3BlY3Mvb3BlbmFwaS9vcGVyYXRpb25zL3Rlc3Qvb3BlcmF0aW9uLTIueWFtbDo0Nlx1MDAxYlszOW0gXHUwMDFiWzkwbSMvcmVzcG9uc2VzLzIwMC9jb250ZW50L2FwcGxpY2F0aW9uL2pzb24vc2NoZW1hXHUwMDFiWzM5bVwiLFxuICAgICAgICAgIFwiXHUwMDFiWzk0bS4vdGVzdC9zcGVjcy9vcGVuYXBpL29wZXJhdGlvbnMvdGVzdC8uLi8uLi90ZXN0LTIueWFtbDo3Mlx1MDAxYlszOW0gXHUwMDFiWzkwbSMvY29tcG9uZW50cy9zY2hlbWFzL3VzZXIvcHJvcGVydGllcy9wZXRcdTAwMWJbMzltXCIsXG4gICAgICAgIF0sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwicGV0IHN0YXR1cyBpbiB0aGUgc3RvcmVcIixcbiAgICAgICAgICBcImVudW1cIjogQXJyYXkgW1xuICAgICAgICAgICAgXCJhdmFpbGFibGVcIixcbiAgICAgICAgICAgIFwicGVuZGluZ1wiLFxuICAgICAgICAgICAgMTIsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBudWxsLFxuICAgICAgICBcImZpbGVcIjogXCIuL3Rlc3Qvc3BlY3Mvb3BlbmFwaS9vcGVyYXRpb25zL3Rlc3Qvb3BlcmF0aW9uLnlhbWxcIixcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE1LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMTI4LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiA3LFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogMyxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMTE1LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDcsXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcInVybCBtdXN0IGJlIGEgdmFsaWQgVVJMXCIsXG4gICAgICAgIFwicGF0aFwiOiBcIlx1MDAxYls5MG1leHRlcm5hbERvY3NcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXVybFx1MDAxYlszOW1cIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW1xuICAgICAgICAgIFwiXHUwMDFiWzk0bS4vdGVzdC9zcGVjcy9vcGVuYXBpL3Rlc3QtMi55YW1sOjEwXHUwMDFiWzM5bSBcdTAwMWJbOTBtIy9wYXRocy8vdXNlci97dXNlcklkfS9wb3N0XHUwMDFiWzM5bVwiLFxuICAgICAgICBdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJ1cmxcIjogXCJhc2Rhc2Rhc1wiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IG51bGwsXG4gICAgICAgIFwiZmlsZVwiOiBcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3Rlc3QtMi55YW1sXCIsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAxNCxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDg3MyxcbiAgICAgICAgICBcImVuZExpbmVcIjogNDMsXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxMyxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogODcxLFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDQzLFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJBbGwgdmFsdWVzIG9mIFxcXFxcImVudW1cXFxcXCIgZmllbGQgbXVzdCBiZSBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoZSBcXFxcXCJ0eXBlXFxcXFwiIGZpZWxkXCIsXG4gICAgICAgIFwicGF0aFwiOiBcIlx1MDAxYls5MG1jb21wb25lbnRzXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1zY2hlbWFzXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1QZXRcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXByb3BlcnRpZXNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXN0YXR1c1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtZW51bVx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtMlx1MDAxYlszOW1cIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwicGV0IHN0YXR1cyBpbiB0aGUgc3RvcmVcIixcbiAgICAgICAgICBcImVudW1cIjogQXJyYXkgW1xuICAgICAgICAgICAgXCJhdmFpbGFibGVcIixcbiAgICAgICAgICAgIFwicGVuZGluZ1wiLFxuICAgICAgICAgICAgMTIsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXVxuICBgKTtcbn0pO1xuXG50ZXN0KFwiVmFsaWRhdGUgZnJvbSBpbnZhbGlkIGZpbGVcIiwgKCkgPT4ge1xuICBleHBlY3QoKCkgPT4ge1xuICAgIHZhbGlkYXRlRnJvbUZpbGUoXCIuL3Rlc3Qvc3BlY3Mvb3BlbmFwaS90ZXN0LWludmFsaWQtMS55YW1sXCIpO1xuICB9KS50b1Rocm93RXJyb3JNYXRjaGluZ0lubGluZVNuYXBzaG90KCdcIkNhblxcJ3QgbG9hZCB5YW1sIGZpbGVcIicpO1xufSk7XG4iXX0=
"use strict";

var _index = require("../index");

test("validate simple document", () => {
  expect((0, _index.validateFromFile)("./test/specs/openapi/simple.yaml")).toMatchInlineSnapshot(`
    Array [
      Object {
        "codeFrame": "[90m[1]: [4m[31mopenapi: 3.0.1[39m
    [90m[2]: info:[39m
    [90m[3]:   taitle: 123[39m
    [90m[4]:   license:[39m
    [90m[5]:     name: Test license[39m
    [90m[6]:   version: 0.0.1[39m
    [90m[7]: [39m[24m[39m",
        "file": "./test/specs/openapi/simple.yaml",
        "location": Object {
          "endCol": 1,
          "endIndex": 86,
          "endLine": 7,
          "startCol": 0,
          "startIndex": 0,
          "startLine": 1,
        },
        "message": "The field \\"paths\\" must be present on this level",
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
        "codeFrame": "[90m[1]: openapi: 3.0.1[39m
    [90m[2]: info:[39m
    [90m[3]:   [4m[31mtaitle[39m[24m: 123[39m
    [90m[4]:   license:[39m
    [90m[5]:     name: Test license[39m
    [90m[6]:  [39m",
        "file": "./test/specs/openapi/simple.yaml",
        "location": Object {
          "endCol": 9,
          "endIndex": 29,
          "endLine": 3,
          "startCol": 3,
          "startIndex": 23,
          "startLine": 3,
        },
        "message": "taitle is not allowed here. Use \\"x-\\" prefix to override this behavior",
        "path": "info/taitle",
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
        "codeFrame": "[90m[1]: openapi: 3.0.1[39m
    [90m[2]: [4m[31minfo[39m[24m:[39m
    [90m[3]:   taitle: 123[39m
    [90m[4]:   license:[39m
    [90m[5]:  [39m",
        "file": "./test/specs/openapi/simple.yaml",
        "location": Object {
          "endCol": 5,
          "endIndex": 19,
          "endLine": 2,
          "startCol": 1,
          "startIndex": 15,
          "startLine": 2,
        },
        "message": "The field \\"title\\" must be present on this level",
        "path": "info",
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
  expect((0, _index.validateFromFile)("./test/specs/openapi/test-2.yaml")).toMatchInlineSnapshot("Array []");
});
test("Validate from invalid file", () => {
  expect(() => {
    (0, _index.validateFromFile)("./test/specs/openapi/test-invalid-1.yaml");
  }).toThrowErrorMatchingInlineSnapshot('"Can\'t load yaml file"');
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9fX3Rlc3RzX18vaW5kZXgudGVzdC5qcyJdLCJuYW1lcyI6WyJ0ZXN0IiwiZXhwZWN0IiwidG9NYXRjaElubGluZVNuYXBzaG90IiwidG9UaHJvd0Vycm9yTWF0Y2hpbmdJbmxpbmVTbmFwc2hvdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFFQUEsSUFBSSxDQUFDLDBCQUFELEVBQTZCLE1BQU07QUFDckNDLEVBQUFBLE1BQU0sQ0FBQyw2QkFBaUIsa0NBQWpCLENBQUQsQ0FBTixDQUNHQyxxQkFESCxDQUMwQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBRDFCO0FBK0ZELENBaEdHLENBQUo7QUFrR0FGLElBQUksQ0FBQyx3Q0FBRCxFQUEyQyxNQUFNO0FBQ25EQyxFQUFBQSxNQUFNLENBQ0osNkJBQWlCLGtDQUFqQixDQURJLENBQU4sQ0FFRUMscUJBRkYsQ0FFd0IsVUFGeEI7QUFHRCxDQUpHLENBQUo7QUFNQUYsSUFBSSxDQUFDLDRCQUFELEVBQStCLE1BQU07QUFDdkNDLEVBQUFBLE1BQU0sQ0FBQyxNQUFNO0FBQ1gsaUNBQWlCLDBDQUFqQjtBQUNELEdBRkssQ0FBTixDQUVHRSxrQ0FGSCxDQUVzQyx5QkFGdEM7QUFHRCxDQUpHLENBQUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2YWxpZGF0ZUZyb21GaWxlIH0gZnJvbSBcIi4uL2luZGV4XCI7XG5cbnRlc3QoXCJ2YWxpZGF0ZSBzaW1wbGUgZG9jdW1lbnRcIiwgKCkgPT4ge1xuICBleHBlY3QodmFsaWRhdGVGcm9tRmlsZShcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3NpbXBsZS55YW1sXCIpKVxuICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgIEFycmF5IFtcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbVsxXTogXHUwMDFiWzRtXHUwMDFiWzMxbW9wZW5hcGk6IDMuMC4xXHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bMl06IGluZm86XHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bM106ICAgdGFpdGxlOiAxMjNcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVs0XTogICBsaWNlbnNlOlx1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtWzVdOiAgICAgbmFtZTogVGVzdCBsaWNlbnNlXHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bNl06ICAgdmVyc2lvbjogMC4wLjFcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVs3XTogXHUwMDFiWzM5bVx1MDAxYlsyNG1cdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiBcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3NpbXBsZS55YW1sXCIsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAxLFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogODYsXG4gICAgICAgICAgXCJlbmRMaW5lXCI6IDcsXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAwLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAwLFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDEsXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcIlRoZSBmaWVsZCBcXFxcXCJwYXRoc1xcXFxcIiBtdXN0IGJlIHByZXNlbnQgb24gdGhpcyBsZXZlbFwiLFxuICAgICAgICBcInBhdGhcIjogXCJcIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcImluZm9cIjogT2JqZWN0IHtcbiAgICAgICAgICAgIFwibGljZW5zZVwiOiBPYmplY3Qge1xuICAgICAgICAgICAgICBcIm5hbWVcIjogXCJUZXN0IGxpY2Vuc2VcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInRhaXRsZVwiOiAxMjMsXG4gICAgICAgICAgICBcInZlcnNpb25cIjogXCIwLjAuMVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJvcGVuYXBpXCI6IFwiMy4wLjFcIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlx1MDAxYls5MG1bMV06IG9wZW5hcGk6IDMuMC4xXHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bMl06IGluZm86XHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bM106ICAgXHUwMDFiWzRtXHUwMDFiWzMxbXRhaXRsZVx1MDAxYlszOW1cdTAwMWJbMjRtOiAxMjNcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVs0XTogICBsaWNlbnNlOlx1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtWzVdOiAgICAgbmFtZTogVGVzdCBsaWNlbnNlXHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bNl06ICBcdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiBcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3NpbXBsZS55YW1sXCIsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiA5LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMjksXG4gICAgICAgICAgXCJlbmRMaW5lXCI6IDMsXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAzLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAyMyxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAzLFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJ0YWl0bGUgaXMgbm90IGFsbG93ZWQgaGVyZS4gVXNlIFxcXFxcIngtXFxcXFwiIHByZWZpeCB0byBvdmVycmlkZSB0aGlzIGJlaGF2aW9yXCIsXG4gICAgICAgIFwicGF0aFwiOiBcImluZm8vdGFpdGxlXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJsaWNlbnNlXCI6IE9iamVjdCB7XG4gICAgICAgICAgICBcIm5hbWVcIjogXCJUZXN0IGxpY2Vuc2VcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwidGFpdGxlXCI6IDEyMyxcbiAgICAgICAgICBcInZlcnNpb25cIjogXCIwLjAuMVwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbVsxXTogb3BlbmFwaTogMy4wLjFcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVsyXTogXHUwMDFiWzRtXHUwMDFiWzMxbWluZm9cdTAwMWJbMzltXHUwMDFiWzI0bTpcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVszXTogICB0YWl0bGU6IDEyM1x1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtWzRdOiAgIGxpY2Vuc2U6XHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bNV06ICBcdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiBcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3NpbXBsZS55YW1sXCIsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiA1LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMTksXG4gICAgICAgICAgXCJlbmRMaW5lXCI6IDIsXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAxNSxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAyLFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGUgZmllbGQgXFxcXFwidGl0bGVcXFxcXCIgbXVzdCBiZSBwcmVzZW50IG9uIHRoaXMgbGV2ZWxcIixcbiAgICAgICAgXCJwYXRoXCI6IFwiaW5mb1wiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwibGljZW5zZVwiOiBPYmplY3Qge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVzdCBsaWNlbnNlXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInRhaXRsZVwiOiAxMjMsXG4gICAgICAgICAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjFcIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgXVxuICBgKTtcbn0pO1xuXG50ZXN0KFwiVmFsaWRhdGUgc2ltcGxlIHZhbGlkIE9wZW5BUEkgZG9jdW1lbnRcIiwgKCkgPT4ge1xuICBleHBlY3QoXG4gICAgdmFsaWRhdGVGcm9tRmlsZShcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3Rlc3QtMi55YW1sXCIpXG4gICkudG9NYXRjaElubGluZVNuYXBzaG90KFwiQXJyYXkgW11cIik7XG59KTtcblxudGVzdChcIlZhbGlkYXRlIGZyb20gaW52YWxpZCBmaWxlXCIsICgpID0+IHtcbiAgZXhwZWN0KCgpID0+IHtcbiAgICB2YWxpZGF0ZUZyb21GaWxlKFwiLi90ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC1pbnZhbGlkLTEueWFtbFwiKTtcbiAgfSkudG9UaHJvd0Vycm9yTWF0Y2hpbmdJbmxpbmVTbmFwc2hvdCgnXCJDYW5cXCd0IGxvYWQgeWFtbCBmaWxlXCInKTtcbn0pO1xuIl19
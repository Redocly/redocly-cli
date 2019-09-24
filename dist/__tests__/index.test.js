"use strict";

var _index = require("../index");

test('validate simple document', () => {
  expect((0, _index.validateFromFile)('./test/specs/openapi/simple.yaml')).toMatchInlineSnapshot(`
    Array [
      Object {
        "codeFrame": "[4m[31mopenapi: 3.0.1
    info:
      taitle: 123
      license:
        name: Test license
      version: 0.0.1
    [39m[24m",
        "file": "/Users/knidarkness/work/redoc.ly/revalid/test/specs/openapi/simple.yaml",
        "location": Object {
          "endCol": 1,
          "endIndex": 86,
          "endLine": 7,
          "startCol": 0,
          "startIndex": 0,
          "startLine": 1,
        },
        "message": "paths must be present on this level",
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
        "codeFrame": "openapi: 3.0.1
    info:
      [4m[31mtaitle:[39m[24m 123
      license:
        name: Test license
     ",
        "file": "/Users/knidarkness/work/redoc.ly/revalid/test/specs/openapi/simple.yaml",
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
        "codeFrame": "openapi: 3.0.1
    [4m[31minfo:[39m[24m
      taitle: 123
      license:
     ",
        "file": "/Users/knidarkness/work/redoc.ly/revalid/test/specs/openapi/simple.yaml",
        "location": Object {
          "endCol": 5,
          "endIndex": 19,
          "endLine": 2,
          "startCol": 1,
          "startIndex": 15,
          "startLine": 2,
        },
        "message": "title must be present on this level",
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
test('Validate simple valid OpenAPI document', () => {
  expect((0, _index.validateFromFile)('./test/specs/openapi/test-2.yaml')).toMatchInlineSnapshot('Array []');
});
test('Validate from invalid file', () => {
  expect(() => {
    (0, _index.validateFromFile)('./test/specs/openapi/test-invalid-1.yaml');
  }).toThrowErrorMatchingInlineSnapshot('"Can\'t load yaml file"');
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9fX3Rlc3RzX18vaW5kZXgudGVzdC5qcyJdLCJuYW1lcyI6WyJ0ZXN0IiwiZXhwZWN0IiwidG9NYXRjaElubGluZVNuYXBzaG90IiwidG9UaHJvd0Vycm9yTWF0Y2hpbmdJbmxpbmVTbmFwc2hvdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFFQUEsSUFBSSxDQUFDLDBCQUFELEVBQTZCLE1BQU07QUFDckNDLEVBQUFBLE1BQU0sQ0FBQyw2QkFBaUIsa0NBQWpCLENBQUQsQ0FBTixDQUNHQyxxQkFESCxDQUMwQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBRDFCO0FBK0ZELENBaEdHLENBQUo7QUFrR0FGLElBQUksQ0FBQyx3Q0FBRCxFQUEyQyxNQUFNO0FBQ25EQyxFQUFBQSxNQUFNLENBQ0osNkJBQWlCLGtDQUFqQixDQURJLENBQU4sQ0FFRUMscUJBRkYsQ0FFd0IsVUFGeEI7QUFHRCxDQUpHLENBQUo7QUFNQUYsSUFBSSxDQUFDLDRCQUFELEVBQStCLE1BQU07QUFDdkNDLEVBQUFBLE1BQU0sQ0FBQyxNQUFNO0FBQ1gsaUNBQWlCLDBDQUFqQjtBQUNELEdBRkssQ0FBTixDQUVHRSxrQ0FGSCxDQUVzQyx5QkFGdEM7QUFHRCxDQUpHLENBQUoiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2YWxpZGF0ZUZyb21GaWxlIH0gZnJvbSAnLi4vaW5kZXgnO1xuXG50ZXN0KCd2YWxpZGF0ZSBzaW1wbGUgZG9jdW1lbnQnLCAoKSA9PiB7XG4gIGV4cGVjdCh2YWxpZGF0ZUZyb21GaWxlKCcuL3Rlc3Qvc3BlY3Mvb3BlbmFwaS9zaW1wbGUueWFtbCcpKVxuICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgIEFycmF5IFtcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzRtXHUwMDFiWzMxbW9wZW5hcGk6IDMuMC4xXG4gICAgaW5mbzpcbiAgICAgIHRhaXRsZTogMTIzXG4gICAgICBsaWNlbnNlOlxuICAgICAgICBuYW1lOiBUZXN0IGxpY2Vuc2VcbiAgICAgIHZlcnNpb246IDAuMC4xXG4gICAgXHUwMDFiWzM5bVx1MDAxYlsyNG1cIixcbiAgICAgICAgXCJmaWxlXCI6IFwiL1VzZXJzL2tuaWRhcmtuZXNzL3dvcmsvcmVkb2MubHkvcmV2YWxpZC90ZXN0L3NwZWNzL29wZW5hcGkvc2ltcGxlLnlhbWxcIixcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDEsXG4gICAgICAgICAgXCJlbmRJbmRleFwiOiA4NixcbiAgICAgICAgICBcImVuZExpbmVcIjogNyxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDAsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDAsXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMSxcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwicGF0aHMgbXVzdCBiZSBwcmVzZW50IG9uIHRoaXMgbGV2ZWxcIixcbiAgICAgICAgXCJwYXRoXCI6IFwiXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJpbmZvXCI6IE9iamVjdCB7XG4gICAgICAgICAgICBcImxpY2Vuc2VcIjogT2JqZWN0IHtcbiAgICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVzdCBsaWNlbnNlXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ0YWl0bGVcIjogMTIzLFxuICAgICAgICAgICAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjFcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwib3BlbmFwaVwiOiBcIjMuMC4xXCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgT2JqZWN0IHtcbiAgICAgICAgXCJjb2RlRnJhbWVcIjogXCJvcGVuYXBpOiAzLjAuMVxuICAgIGluZm86XG4gICAgICBcdTAwMWJbNG1cdTAwMWJbMzFtdGFpdGxlOlx1MDAxYlszOW1cdTAwMWJbMjRtIDEyM1xuICAgICAgbGljZW5zZTpcbiAgICAgICAgbmFtZTogVGVzdCBsaWNlbnNlXG4gICAgIFwiLFxuICAgICAgICBcImZpbGVcIjogXCIvVXNlcnMva25pZGFya25lc3Mvd29yay9yZWRvYy5seS9yZXZhbGlkL3Rlc3Qvc3BlY3Mvb3BlbmFwaS9zaW1wbGUueWFtbFwiLFxuICAgICAgICBcImxvY2F0aW9uXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJlbmRDb2xcIjogOSxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDI5LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAzLFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogMyxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMjMsXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMyxcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwidGFpdGxlIGlzIG5vdCBhbGxvd2VkIGhlcmUuIFVzZSBcXFxcXCJ4LVxcXFxcIiBwcmVmaXggdG8gb3ZlcnJpZGUgdGhpcyBiZWhhdmlvclwiLFxuICAgICAgICBcInBhdGhcIjogXCJpbmZvL3RhaXRsZVwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwibGljZW5zZVwiOiBPYmplY3Qge1xuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGVzdCBsaWNlbnNlXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInRhaXRsZVwiOiAxMjMsXG4gICAgICAgICAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjFcIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIm9wZW5hcGk6IDMuMC4xXG4gICAgXHUwMDFiWzRtXHUwMDFiWzMxbWluZm86XHUwMDFiWzM5bVx1MDAxYlsyNG1cbiAgICAgIHRhaXRsZTogMTIzXG4gICAgICBsaWNlbnNlOlxuICAgICBcIixcbiAgICAgICAgXCJmaWxlXCI6IFwiL1VzZXJzL2tuaWRhcmtuZXNzL3dvcmsvcmVkb2MubHkvcmV2YWxpZC90ZXN0L3NwZWNzL29wZW5hcGkvc2ltcGxlLnlhbWxcIixcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDUsXG4gICAgICAgICAgXCJlbmRJbmRleFwiOiAxOSxcbiAgICAgICAgICBcImVuZExpbmVcIjogMixcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDEsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDE1LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDIsXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcInRpdGxlIG11c3QgYmUgcHJlc2VudCBvbiB0aGlzIGxldmVsXCIsXG4gICAgICAgIFwicGF0aFwiOiBcImluZm9cIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcImxpY2Vuc2VcIjogT2JqZWN0IHtcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlRlc3QgbGljZW5zZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJ0YWl0bGVcIjogMTIzLFxuICAgICAgICAgIFwidmVyc2lvblwiOiBcIjAuMC4xXCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIF1cbiAgYCk7XG59KTtcblxudGVzdCgnVmFsaWRhdGUgc2ltcGxlIHZhbGlkIE9wZW5BUEkgZG9jdW1lbnQnLCAoKSA9PiB7XG4gIGV4cGVjdChcbiAgICB2YWxpZGF0ZUZyb21GaWxlKCcuL3Rlc3Qvc3BlY3Mvb3BlbmFwaS90ZXN0LTIueWFtbCcpLFxuICApLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdCgnQXJyYXkgW10nKTtcbn0pO1xuXG50ZXN0KCdWYWxpZGF0ZSBmcm9tIGludmFsaWQgZmlsZScsICgpID0+IHtcbiAgZXhwZWN0KCgpID0+IHtcbiAgICB2YWxpZGF0ZUZyb21GaWxlKCcuL3Rlc3Qvc3BlY3Mvb3BlbmFwaS90ZXN0LWludmFsaWQtMS55YW1sJyk7XG4gIH0pLnRvVGhyb3dFcnJvck1hdGNoaW5nSW5saW5lU25hcHNob3QoJ1wiQ2FuXFwndCBsb2FkIHlhbWwgZmlsZVwiJyk7XG59KTtcbiJdfQ==
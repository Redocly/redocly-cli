"use strict";

var _jsYaml = _interopRequireDefault(require("js-yaml"));

var _fs = _interopRequireDefault(require("fs"));

var _ = require("..");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getSource = () => _fs.default.readFileSync("./test/specs/openapi/test-1.yaml", "utf-8");

const createContext = () => ({
  document: _jsYaml.default.safeLoad(getSource()),
  path: ["paths", "/user/{userId}/{name}", "get", "parameters"],
  pathStack: [],
  source: getSource(),
  enableCodeframe: true
});

describe("createErrorFieldNotAllowed", () => {
  test("", () => {
    const ctx = createContext();
    const node = {
      required: 123
    };
    const error = (0, _.createErrorFieldNotAllowed)("wrong", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m13| [39m
      [90m14|       summary: Get a list of all users[39m
      [90m15|       description: Also gives their status[39m
      [90m16|[39m[31m       [4m[31mparameters[39m[24m:[39m
      [90m17|         - name: userId[39m
      [90m18|           in: path[39m",
        "file": undefined,
        "location": Object {
          "endCol": 17,
          "endIndex": 275,
          "endLine": 16,
          "startCol": 7,
          "startIndex": 265,
          "startLine": 16,
        },
        "message": "The field 'wrong' is not allowed here. Use \\"x-\\" prefix to override this behavior.",
        "path": "[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "required": 123,
        },
      }
    `);
  });
});
describe("createErrorMissingRequiredField", () => {
  test("", () => {
    const ctx = createContext();
    const node = {
      required: 123
    };
    const error = (0, _.createErrorMissingRequiredField)("name", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m13| [39m
      [90m14|       summary: Get a list of all users[39m
      [90m15|       description: Also gives their status[39m
      [90m16|[39m[31m       [4m[31mparameters[39m[24m:[39m
      [90m17|         - name: userId[39m
      [90m18|           in: path[39m",
        "file": undefined,
        "location": Object {
          "endCol": 17,
          "endIndex": 275,
          "endLine": 16,
          "startCol": 7,
          "startIndex": 265,
          "startLine": 16,
        },
        "message": "The field 'name' must be present on this level.",
        "path": "[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "required": 123,
        },
      }
    `);
  });
});
describe("createErrrorFieldTypeMismatch", () => {
  test("", () => {
    const ctx = createContext();
    ctx.path = ["paths", "/user/{userId}/{name}", "get", "parameters", 0, "required"];
    const node = {
      required: 123
    };
    const error = (0, _.createErrrorFieldTypeMismatch)("boolean", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m16| [39m
      [90m17|         - name: userId[39m
      [90m18|           in: path[39m
      [90m19|           [4m[31mrequired[39m[24m: true[39m
      [90m20|           description: Id of a user[39m",
        "file": undefined,
        "location": Object {
          "endCol": 19,
          "endIndex": 337,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "This field must be of boolean type.",
        "path": "[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "required": 123,
        },
      }
    `);
  });
});
describe("createErrorMutuallyExclusiveFields", () => {
  const ctx = createContext();
  ctx.path = ["paths", "/user/{userId}/{name}", "get", "parameters", 0, "required"];
  const node = {
    required: 123
  };
  const error = (0, _.createErrorMutuallyExclusiveFields)(["example", "examples"], node, ctx);
  expect(error).toMatchInlineSnapshot(`
    Object {
      "codeFrame": "[90m16| [39m
    [90m17|         - name: userId[39m
    [90m18|           in: path[39m
    [90m19|           [4m[31mrequired[39m[24m: true[39m
    [90m20|           description: Id of a user[39m",
      "file": undefined,
      "location": Object {
        "endCol": 19,
        "endIndex": 337,
        "endLine": 19,
        "startCol": 11,
        "startIndex": 329,
        "startLine": 19,
      },
      "message": "Fields 'example', 'examples' are mutually exclusive.",
      "path": "[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m",
      "pathStack": Array [],
      "prettyPrint": [Function],
      "severity": "ERROR",
      "value": Object {
        "required": 123,
      },
    }
  `);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9lcnJvci9fX3Rlc3RzX18vaW5kZXgudGVzdC5qcyJdLCJuYW1lcyI6WyJnZXRTb3VyY2UiLCJmcyIsInJlYWRGaWxlU3luYyIsImNyZWF0ZUNvbnRleHQiLCJkb2N1bWVudCIsInlhbWwiLCJzYWZlTG9hZCIsInBhdGgiLCJwYXRoU3RhY2siLCJzb3VyY2UiLCJlbmFibGVDb2RlZnJhbWUiLCJkZXNjcmliZSIsInRlc3QiLCJjdHgiLCJub2RlIiwicmVxdWlyZWQiLCJlcnJvciIsImV4cGVjdCIsInRvTWF0Y2hJbmxpbmVTbmFwc2hvdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFDQTs7QUFDQTs7OztBQU9BLE1BQU1BLFNBQVMsR0FBRyxNQUNoQkMsWUFBR0MsWUFBSCxDQUFnQixrQ0FBaEIsRUFBb0QsT0FBcEQsQ0FERjs7QUFHQSxNQUFNQyxhQUFhLEdBQUcsT0FBTztBQUMzQkMsRUFBQUEsUUFBUSxFQUFFQyxnQkFBS0MsUUFBTCxDQUFjTixTQUFTLEVBQXZCLENBRGlCO0FBRTNCTyxFQUFBQSxJQUFJLEVBQUUsQ0FBQyxPQUFELEVBQVUsdUJBQVYsRUFBbUMsS0FBbkMsRUFBMEMsWUFBMUMsQ0FGcUI7QUFHM0JDLEVBQUFBLFNBQVMsRUFBRSxFQUhnQjtBQUkzQkMsRUFBQUEsTUFBTSxFQUFFVCxTQUFTLEVBSlU7QUFLM0JVLEVBQUFBLGVBQWUsRUFBRTtBQUxVLENBQVAsQ0FBdEI7O0FBUUFDLFFBQVEsQ0FBQyw0QkFBRCxFQUErQixNQUFNO0FBQzNDQyxFQUFBQSxJQUFJLENBQUMsRUFBRCxFQUFLLE1BQU07QUFDYixVQUFNQyxHQUFHLEdBQUdWLGFBQWEsRUFBekI7QUFDQSxVQUFNVyxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyxrQ0FBMkIsT0FBM0IsRUFBb0NGLElBQXBDLEVBQTBDRCxHQUExQyxDQUFkO0FBQ0FJLElBQUFBLE1BQU0sQ0FBQ0QsS0FBRCxDQUFOLENBQWNFLHFCQUFkLENBQXFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztLQUFyQztBQTJCRCxHQS9CRyxDQUFKO0FBZ0NELENBakNPLENBQVI7QUFtQ0FQLFFBQVEsQ0FBQyxpQ0FBRCxFQUFvQyxNQUFNO0FBQ2hEQyxFQUFBQSxJQUFJLENBQUMsRUFBRCxFQUFLLE1BQU07QUFDYixVQUFNQyxHQUFHLEdBQUdWLGFBQWEsRUFBekI7QUFDQSxVQUFNVyxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyx1Q0FBZ0MsTUFBaEMsRUFBd0NGLElBQXhDLEVBQThDRCxHQUE5QyxDQUFkO0FBQ0FJLElBQUFBLE1BQU0sQ0FBQ0QsS0FBRCxDQUFOLENBQWNFLHFCQUFkLENBQXFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztLQUFyQztBQTJCRCxHQS9CRyxDQUFKO0FBZ0NELENBakNPLENBQVI7QUFtQ0FQLFFBQVEsQ0FBQywrQkFBRCxFQUFrQyxNQUFNO0FBQzlDQyxFQUFBQSxJQUFJLENBQUMsRUFBRCxFQUFLLE1BQU07QUFDYixVQUFNQyxHQUFHLEdBQUdWLGFBQWEsRUFBekI7QUFDQVUsSUFBQUEsR0FBRyxDQUFDTixJQUFKLEdBQVcsQ0FDVCxPQURTLEVBRVQsdUJBRlMsRUFHVCxLQUhTLEVBSVQsWUFKUyxFQUtULENBTFMsRUFNVCxVQU5TLENBQVg7QUFRQSxVQUFNTyxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyxxQ0FBOEIsU0FBOUIsRUFBeUNGLElBQXpDLEVBQStDRCxHQUEvQyxDQUFkO0FBQ0FJLElBQUFBLE1BQU0sQ0FBQ0QsS0FBRCxDQUFOLENBQWNFLHFCQUFkLENBQXFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0tBQXJDO0FBMEJELEdBdENHLENBQUo7QUF1Q0QsQ0F4Q08sQ0FBUjtBQTBDQVAsUUFBUSxDQUFDLG9DQUFELEVBQXVDLE1BQU07QUFDbkQsUUFBTUUsR0FBRyxHQUFHVixhQUFhLEVBQXpCO0FBQ0FVLEVBQUFBLEdBQUcsQ0FBQ04sSUFBSixHQUFXLENBQ1QsT0FEUyxFQUVULHVCQUZTLEVBR1QsS0FIUyxFQUlULFlBSlMsRUFLVCxDQUxTLEVBTVQsVUFOUyxDQUFYO0FBUUEsUUFBTU8sSUFBSSxHQUFHO0FBQUVDLElBQUFBLFFBQVEsRUFBRTtBQUFaLEdBQWI7QUFDQSxRQUFNQyxLQUFLLEdBQUcsMENBQ1osQ0FBQyxTQUFELEVBQVksVUFBWixDQURZLEVBRVpGLElBRlksRUFHWkQsR0FIWSxDQUFkO0FBS0FJLEVBQUFBLE1BQU0sQ0FBQ0QsS0FBRCxDQUFOLENBQWNFLHFCQUFkLENBQXFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBQXJDO0FBMEJELENBMUNPLENBQVIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeWFtbCBmcm9tIFwianMteWFtbFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZCxcbiAgY3JlYXRlRXJyb3JGaWVsZE5vdEFsbG93ZWQsXG4gIGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoLFxuICBjcmVhdGVFcnJvck11dHVhbGx5RXhjbHVzaXZlRmllbGRzXG59IGZyb20gXCIuLlwiO1xuXG5jb25zdCBnZXRTb3VyY2UgPSAoKSA9PlxuICBmcy5yZWFkRmlsZVN5bmMoXCIuL3Rlc3Qvc3BlY3Mvb3BlbmFwaS90ZXN0LTEueWFtbFwiLCBcInV0Zi04XCIpO1xuXG5jb25zdCBjcmVhdGVDb250ZXh0ID0gKCkgPT4gKHtcbiAgZG9jdW1lbnQ6IHlhbWwuc2FmZUxvYWQoZ2V0U291cmNlKCkpLFxuICBwYXRoOiBbXCJwYXRoc1wiLCBcIi91c2VyL3t1c2VySWR9L3tuYW1lfVwiLCBcImdldFwiLCBcInBhcmFtZXRlcnNcIl0sXG4gIHBhdGhTdGFjazogW10sXG4gIHNvdXJjZTogZ2V0U291cmNlKCksXG4gIGVuYWJsZUNvZGVmcmFtZTogdHJ1ZVxufSk7XG5cbmRlc2NyaWJlKFwiY3JlYXRlRXJyb3JGaWVsZE5vdEFsbG93ZWRcIiwgKCkgPT4ge1xuICB0ZXN0KFwiXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3JGaWVsZE5vdEFsbG93ZWQoXCJ3cm9uZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvcikudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbTEzfCBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTR8ICAgICAgIHN1bW1hcnk6IEdldCBhIGxpc3Qgb2YgYWxsIHVzZXJzXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbTE1fCAgICAgICBkZXNjcmlwdGlvbjogQWxzbyBnaXZlcyB0aGVpciBzdGF0dXNcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTZ8XHUwMDFiWzM5bVx1MDAxYlszMW0gICAgICAgXHUwMDFiWzRtXHUwMDFiWzMxbXBhcmFtZXRlcnNcdTAwMWJbMzltXHUwMDFiWzI0bTpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTd8ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTh8ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE3LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMjc1LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxNixcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDcsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDI2NSxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAxNixcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwiVGhlIGZpZWxkICd3cm9uZycgaXMgbm90IGFsbG93ZWQgaGVyZS4gVXNlIFxcXFxcIngtXFxcXFwiIHByZWZpeCB0byBvdmVycmlkZSB0aGlzIGJlaGF2aW9yLlwiLFxuICAgICAgICBcInBhdGhcIjogXCJcdTAwMWJbOTBtcGF0aHNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbVsnXHUwMDFiWzM5bVx1MDAxYls5NG0vdXNlci97dXNlcklkfS97bmFtZX1cdTAwMWJbMzltXHUwMDFiWzkwbSddXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1nZXRcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXBhcmFtZXRlcnNcdTAwMWJbMzltXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJyZXF1aXJlZFwiOiAxMjMsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgYCk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKFwiY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZFwiLCAoKSA9PiB7XG4gIHRlc3QoXCJcIiwgKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgICBjb25zdCBub2RlID0geyByZXF1aXJlZDogMTIzIH07XG4gICAgY29uc3QgZXJyb3IgPSBjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkKFwibmFtZVwiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvcikudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbTEzfCBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTR8ICAgICAgIHN1bW1hcnk6IEdldCBhIGxpc3Qgb2YgYWxsIHVzZXJzXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbTE1fCAgICAgICBkZXNjcmlwdGlvbjogQWxzbyBnaXZlcyB0aGVpciBzdGF0dXNcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTZ8XHUwMDFiWzM5bVx1MDAxYlszMW0gICAgICAgXHUwMDFiWzRtXHUwMDFiWzMxbXBhcmFtZXRlcnNcdTAwMWJbMzltXHUwMDFiWzI0bTpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTd8ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTh8ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE3LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMjc1LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxNixcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDcsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDI2NSxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAxNixcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwiVGhlIGZpZWxkICduYW1lJyBtdXN0IGJlIHByZXNlbnQgb24gdGhpcyBsZXZlbC5cIixcbiAgICAgICAgXCJwYXRoXCI6IFwiXHUwMDFiWzkwbXBhdGhzXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1bJ1x1MDAxYlszOW1cdTAwMWJbOTRtL3VzZXIve3VzZXJJZH0ve25hbWV9XHUwMDFiWzM5bVx1MDAxYls5MG0nXVx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtZ2V0XHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1wYXJhbWV0ZXJzXHUwMDFiWzM5bVwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwicmVxdWlyZWRcIjogMTIzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIGApO1xuICB9KTtcbn0pO1xuXG5kZXNjcmliZShcImNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoXCIsICgpID0+IHtcbiAgdGVzdChcIlwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGN0eC5wYXRoID0gW1xuICAgICAgXCJwYXRoc1wiLFxuICAgICAgXCIvdXNlci97dXNlcklkfS97bmFtZX1cIixcbiAgICAgIFwiZ2V0XCIsXG4gICAgICBcInBhcmFtZXRlcnNcIixcbiAgICAgIDAsXG4gICAgICBcInJlcXVpcmVkXCJcbiAgICBdO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycnJvckZpZWxkVHlwZU1pc21hdGNoKFwiYm9vbGVhblwiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvcikudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbTE2fCBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTd8ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTh8ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG0xOXwgICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZFx1MDAxYlszOW1cdTAwMWJbMjRtOiB0cnVlXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbTIwfCAgICAgICAgICAgZGVzY3JpcHRpb246IElkIG9mIGEgdXNlclx1MDAxYlszOW1cIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE5LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMzM3LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxOSxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDExLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAzMjksXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMTksXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcIlRoaXMgZmllbGQgbXVzdCBiZSBvZiBib29sZWFuIHR5cGUuXCIsXG4gICAgICAgIFwicGF0aFwiOiBcIlx1MDAxYls5MG1wYXRoc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtWydcdTAwMWJbMzltXHUwMDFiWzk0bS91c2VyL3t1c2VySWR9L3tuYW1lfVx1MDAxYlszOW1cdTAwMWJbOTBtJ11cdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbWdldFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcGFyYW1ldGVyc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtMFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcmVxdWlyZWRcdTAwMWJbMzltXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJyZXF1aXJlZFwiOiAxMjMsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgYCk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKFwiY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkc1wiLCAoKSA9PiB7XG4gIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgY3R4LnBhdGggPSBbXG4gICAgXCJwYXRoc1wiLFxuICAgIFwiL3VzZXIve3VzZXJJZH0ve25hbWV9XCIsXG4gICAgXCJnZXRcIixcbiAgICBcInBhcmFtZXRlcnNcIixcbiAgICAwLFxuICAgIFwicmVxdWlyZWRcIlxuICBdO1xuICBjb25zdCBub2RlID0geyByZXF1aXJlZDogMTIzIH07XG4gIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkcyhcbiAgICBbXCJleGFtcGxlXCIsIFwiZXhhbXBsZXNcIl0sXG4gICAgbm9kZSxcbiAgICBjdHhcbiAgKTtcbiAgZXhwZWN0KGVycm9yKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgIE9iamVjdCB7XG4gICAgICBcImNvZGVGcmFtZVwiOiBcIlx1MDAxYls5MG0xNnwgXHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG0xN3wgICAgICAgICAtIG5hbWU6IHVzZXJJZFx1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtMTh8ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtMTl8ICAgICAgICAgICBcdTAwMWJbNG1cdTAwMWJbMzFtcmVxdWlyZWRcdTAwMWJbMzltXHUwMDFiWzI0bTogdHJ1ZVx1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtMjB8ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVwiLFxuICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgXCJlbmRDb2xcIjogMTksXG4gICAgICAgIFwiZW5kSW5kZXhcIjogMzM3LFxuICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgIFwic3RhcnRDb2xcIjogMTEsXG4gICAgICAgIFwic3RhcnRJbmRleFwiOiAzMjksXG4gICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgfSxcbiAgICAgIFwibWVzc2FnZVwiOiBcIkZpZWxkcyAnZXhhbXBsZScsICdleGFtcGxlcycgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZS5cIixcbiAgICAgIFwicGF0aFwiOiBcIlx1MDAxYls5MG1wYXRoc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtWydcdTAwMWJbMzltXHUwMDFiWzk0bS91c2VyL3t1c2VySWR9L3tuYW1lfVx1MDAxYlszOW1cdTAwMWJbOTBtJ11cdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbWdldFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcGFyYW1ldGVyc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtMFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcmVxdWlyZWRcdTAwMWJbMzltXCIsXG4gICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICBcInJlcXVpcmVkXCI6IDEyMyxcbiAgICAgIH0sXG4gICAgfVxuICBgKTtcbn0pO1xuIl19
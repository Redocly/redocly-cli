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
        "codeFrame": "[90m[12]: [39m
      [90m[13]:     get:[39m
      [90m[14]:       summary: Get a list of all users[39m
      [90m[15]:       description: Also gives their status[39m
      [90m[16]:       [4m[31mparameters[39m[24m:[39m
      [90m[17]:         - name: userId[39m
      [90m[18]:           in: path[39m
      [90m[19]:  [39m",
        "file": undefined,
        "location": Object {
          "endCol": 17,
          "endIndex": 275,
          "endLine": 16,
          "startCol": 7,
          "startIndex": 265,
          "startLine": 16,
        },
        "message": "wrong is not allowed here. Use \\"x-\\" prefix to override this behavior",
        "path": "paths//user/{userId}/{name}/get/parameters",
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
        "codeFrame": "[90m[12]: [39m
      [90m[13]:     get:[39m
      [90m[14]:       summary: Get a list of all users[39m
      [90m[15]:       description: Also gives their status[39m
      [90m[16]:       [4m[31mparameters[39m[24m:[39m
      [90m[17]:         - name: userId[39m
      [90m[18]:           in: path[39m
      [90m[19]:  [39m",
        "file": undefined,
        "location": Object {
          "endCol": 17,
          "endIndex": 275,
          "endLine": 16,
          "startCol": 7,
          "startIndex": 265,
          "startLine": 16,
        },
        "message": "The field \\"name\\" must be present on this level",
        "path": "paths//user/{userId}/{name}/get/parameters",
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
        "codeFrame": "[90m[15]: [39m
      [90m[16]:       parameters:[39m
      [90m[17]:         - name: userId[39m
      [90m[18]:           in: path[39m
      [90m[19]:           [4m[31mrequired[39m[24m: true[39m
      [90m[20]:           description: Id of a user[39m
      [90m[21]:           schema:[39m
      [90m[22]:  [39m",
        "file": undefined,
        "location": Object {
          "endCol": 19,
          "endIndex": 337,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "This field must be of boolean type",
        "path": "paths//user/{userId}/{name}/get/parameters/0/required",
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
      "codeFrame": "[90m[15]: [39m
    [90m[16]:       parameters:[39m
    [90m[17]:         - name: userId[39m
    [90m[18]:           in: path[39m
    [90m[19]:           [4m[31mrequired[39m[24m: true[39m
    [90m[20]:           description: Id of a user[39m
    [90m[21]:           schema:[39m
    [90m[22]:  [39m",
      "file": undefined,
      "location": Object {
        "endCol": 19,
        "endIndex": 337,
        "endLine": 19,
        "startCol": 11,
        "startIndex": 329,
        "startLine": 19,
      },
      "message": "example, examples are mutually exclusive",
      "path": "paths//user/{userId}/{name}/get/parameters/0/required",
      "pathStack": Array [],
      "prettyPrint": [Function],
      "severity": "ERROR",
      "value": Object {
        "required": 123,
      },
    }
  `);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9lcnJvci9fX3Rlc3RzX18vaW5kZXgudGVzdC5qcyJdLCJuYW1lcyI6WyJnZXRTb3VyY2UiLCJmcyIsInJlYWRGaWxlU3luYyIsImNyZWF0ZUNvbnRleHQiLCJkb2N1bWVudCIsInlhbWwiLCJzYWZlTG9hZCIsInBhdGgiLCJwYXRoU3RhY2siLCJzb3VyY2UiLCJlbmFibGVDb2RlZnJhbWUiLCJkZXNjcmliZSIsInRlc3QiLCJjdHgiLCJub2RlIiwicmVxdWlyZWQiLCJlcnJvciIsImV4cGVjdCIsInRvTWF0Y2hJbmxpbmVTbmFwc2hvdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFDQTs7QUFDQTs7OztBQU9BLE1BQU1BLFNBQVMsR0FBRyxNQUNoQkMsWUFBR0MsWUFBSCxDQUFnQixrQ0FBaEIsRUFBb0QsT0FBcEQsQ0FERjs7QUFHQSxNQUFNQyxhQUFhLEdBQUcsT0FBTztBQUMzQkMsRUFBQUEsUUFBUSxFQUFFQyxnQkFBS0MsUUFBTCxDQUFjTixTQUFTLEVBQXZCLENBRGlCO0FBRTNCTyxFQUFBQSxJQUFJLEVBQUUsQ0FBQyxPQUFELEVBQVUsdUJBQVYsRUFBbUMsS0FBbkMsRUFBMEMsWUFBMUMsQ0FGcUI7QUFHM0JDLEVBQUFBLFNBQVMsRUFBRSxFQUhnQjtBQUkzQkMsRUFBQUEsTUFBTSxFQUFFVCxTQUFTLEVBSlU7QUFLM0JVLEVBQUFBLGVBQWUsRUFBRTtBQUxVLENBQVAsQ0FBdEI7O0FBUUFDLFFBQVEsQ0FBQyw0QkFBRCxFQUErQixNQUFNO0FBQzNDQyxFQUFBQSxJQUFJLENBQUMsRUFBRCxFQUFLLE1BQU07QUFDYixVQUFNQyxHQUFHLEdBQUdWLGFBQWEsRUFBekI7QUFDQSxVQUFNVyxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyxrQ0FBMkIsT0FBM0IsRUFBb0NGLElBQXBDLEVBQTBDRCxHQUExQyxDQUFkO0FBQ0FJLElBQUFBLE1BQU0sQ0FBQ0QsS0FBRCxDQUFOLENBQWNFLHFCQUFkLENBQXFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0tBQXJDO0FBNkJELEdBakNHLENBQUo7QUFrQ0QsQ0FuQ08sQ0FBUjtBQXFDQVAsUUFBUSxDQUFDLGlDQUFELEVBQW9DLE1BQU07QUFDaERDLEVBQUFBLElBQUksQ0FBQyxFQUFELEVBQUssTUFBTTtBQUNiLFVBQU1DLEdBQUcsR0FBR1YsYUFBYSxFQUF6QjtBQUNBLFVBQU1XLElBQUksR0FBRztBQUFFQyxNQUFBQSxRQUFRLEVBQUU7QUFBWixLQUFiO0FBQ0EsVUFBTUMsS0FBSyxHQUFHLHVDQUFnQyxNQUFoQyxFQUF3Q0YsSUFBeEMsRUFBOENELEdBQTlDLENBQWQ7QUFDQUksSUFBQUEsTUFBTSxDQUFDRCxLQUFELENBQU4sQ0FBY0UscUJBQWQsQ0FBcUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7S0FBckM7QUE2QkQsR0FqQ0csQ0FBSjtBQWtDRCxDQW5DTyxDQUFSO0FBcUNBUCxRQUFRLENBQUMsK0JBQUQsRUFBa0MsTUFBTTtBQUM5Q0MsRUFBQUEsSUFBSSxDQUFDLEVBQUQsRUFBSyxNQUFNO0FBQ2IsVUFBTUMsR0FBRyxHQUFHVixhQUFhLEVBQXpCO0FBQ0FVLElBQUFBLEdBQUcsQ0FBQ04sSUFBSixHQUFXLENBQ1QsT0FEUyxFQUVULHVCQUZTLEVBR1QsS0FIUyxFQUlULFlBSlMsRUFLVCxDQUxTLEVBTVQsVUFOUyxDQUFYO0FBUUEsVUFBTU8sSUFBSSxHQUFHO0FBQUVDLE1BQUFBLFFBQVEsRUFBRTtBQUFaLEtBQWI7QUFDQSxVQUFNQyxLQUFLLEdBQUcscUNBQThCLFNBQTlCLEVBQXlDRixJQUF6QyxFQUErQ0QsR0FBL0MsQ0FBZDtBQUNBSSxJQUFBQSxNQUFNLENBQUNELEtBQUQsQ0FBTixDQUFjRSxxQkFBZCxDQUFxQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztLQUFyQztBQTZCRCxHQXpDRyxDQUFKO0FBMENELENBM0NPLENBQVI7QUE2Q0FQLFFBQVEsQ0FBQyxvQ0FBRCxFQUF1QyxNQUFNO0FBQ25ELFFBQU1FLEdBQUcsR0FBR1YsYUFBYSxFQUF6QjtBQUNBVSxFQUFBQSxHQUFHLENBQUNOLElBQUosR0FBVyxDQUNULE9BRFMsRUFFVCx1QkFGUyxFQUdULEtBSFMsRUFJVCxZQUpTLEVBS1QsQ0FMUyxFQU1ULFVBTlMsQ0FBWDtBQVFBLFFBQU1PLElBQUksR0FBRztBQUFFQyxJQUFBQSxRQUFRLEVBQUU7QUFBWixHQUFiO0FBQ0EsUUFBTUMsS0FBSyxHQUFHLDBDQUNaLENBQUMsU0FBRCxFQUFZLFVBQVosQ0FEWSxFQUVaRixJQUZZLEVBR1pELEdBSFksQ0FBZDtBQUtBSSxFQUFBQSxNQUFNLENBQUNELEtBQUQsQ0FBTixDQUFjRSxxQkFBZCxDQUFxQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQUFyQztBQTZCRCxDQTdDTyxDQUFSIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHlhbWwgZnJvbSBcImpzLXlhbWxcIjtcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQsXG4gIGNyZWF0ZUVycm9yRmllbGROb3RBbGxvd2VkLFxuICBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCxcbiAgY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkc1xufSBmcm9tIFwiLi5cIjtcblxuY29uc3QgZ2V0U291cmNlID0gKCkgPT5cbiAgZnMucmVhZEZpbGVTeW5jKFwiLi90ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0xLnlhbWxcIiwgXCJ1dGYtOFwiKTtcblxuY29uc3QgY3JlYXRlQ29udGV4dCA9ICgpID0+ICh7XG4gIGRvY3VtZW50OiB5YW1sLnNhZmVMb2FkKGdldFNvdXJjZSgpKSxcbiAgcGF0aDogW1wicGF0aHNcIiwgXCIvdXNlci97dXNlcklkfS97bmFtZX1cIiwgXCJnZXRcIiwgXCJwYXJhbWV0ZXJzXCJdLFxuICBwYXRoU3RhY2s6IFtdLFxuICBzb3VyY2U6IGdldFNvdXJjZSgpLFxuICBlbmFibGVDb2RlZnJhbWU6IHRydWVcbn0pO1xuXG5kZXNjcmliZShcImNyZWF0ZUVycm9yRmllbGROb3RBbGxvd2VkXCIsICgpID0+IHtcbiAgdGVzdChcIlwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yRmllbGROb3RBbGxvd2VkKFwid3JvbmdcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlx1MDAxYls5MG1bMTJdOiBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzEzXTogICAgIGdldDpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE0XTogICAgICAgc3VtbWFyeTogR2V0IGEgbGlzdCBvZiBhbGwgdXNlcnNcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE1XTogICAgICAgZGVzY3JpcHRpb246IEFsc28gZ2l2ZXMgdGhlaXIgc3RhdHVzXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxNl06ICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1wYXJhbWV0ZXJzXHUwMDFiWzM5bVx1MDAxYlsyNG06XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxN106ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE4XTogICAgICAgICAgIGluOiBwYXRoXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxOV06ICBcdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAxNyxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDI3NSxcbiAgICAgICAgICBcImVuZExpbmVcIjogMTYsXG4gICAgICAgICAgXCJzdGFydENvbFwiOiA3LFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAyNjUsXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMTYsXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcIndyb25nIGlzIG5vdCBhbGxvd2VkIGhlcmUuIFVzZSBcXFxcXCJ4LVxcXFxcIiBwcmVmaXggdG8gb3ZlcnJpZGUgdGhpcyBiZWhhdmlvclwiLFxuICAgICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnNcIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcInJlcXVpcmVkXCI6IDEyMyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICBgKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoXCJjcmVhdGVFcnJvck1pc3NpbmdSZXF1aXJlZEZpZWxkXCIsICgpID0+IHtcbiAgdGVzdChcIlwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQoXCJuYW1lXCIsIG5vZGUsIGN0eCk7XG4gICAgZXhwZWN0KGVycm9yKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgICAgT2JqZWN0IHtcbiAgICAgICAgXCJjb2RlRnJhbWVcIjogXCJcdTAwMWJbOTBtWzEyXTogXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxM106ICAgICBnZXQ6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxNF06ICAgICAgIHN1bW1hcnk6IEdldCBhIGxpc3Qgb2YgYWxsIHVzZXJzXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxNV06ICAgICAgIGRlc2NyaXB0aW9uOiBBbHNvIGdpdmVzIHRoZWlyIHN0YXR1c1x1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMTZdOiAgICAgICBcdTAwMWJbNG1cdTAwMWJbMzFtcGFyYW1ldGVyc1x1MDAxYlszOW1cdTAwMWJbMjRtOlx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMTddOiAgICAgICAgIC0gbmFtZTogdXNlcklkXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxOF06ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMTldOiAgXHUwMDFiWzM5bVwiLFxuICAgICAgICBcImZpbGVcIjogdW5kZWZpbmVkLFxuICAgICAgICBcImxvY2F0aW9uXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJlbmRDb2xcIjogMTcsXG4gICAgICAgICAgXCJlbmRJbmRleFwiOiAyNzUsXG4gICAgICAgICAgXCJlbmRMaW5lXCI6IDE2LFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogNyxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMjY1LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDE2LFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGUgZmllbGQgXFxcXFwibmFtZVxcXFxcIiBtdXN0IGJlIHByZXNlbnQgb24gdGhpcyBsZXZlbFwiLFxuICAgICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnNcIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcInJlcXVpcmVkXCI6IDEyMyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICBgKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoXCJjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaFwiLCAoKSA9PiB7XG4gIHRlc3QoXCJcIiwgKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgICBjdHgucGF0aCA9IFtcbiAgICAgIFwicGF0aHNcIixcbiAgICAgIFwiL3VzZXIve3VzZXJJZH0ve25hbWV9XCIsXG4gICAgICBcImdldFwiLFxuICAgICAgXCJwYXJhbWV0ZXJzXCIsXG4gICAgICAwLFxuICAgICAgXCJyZXF1aXJlZFwiXG4gICAgXTtcbiAgICBjb25zdCBub2RlID0geyByZXF1aXJlZDogMTIzIH07XG4gICAgY29uc3QgZXJyb3IgPSBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaChcImJvb2xlYW5cIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlx1MDAxYls5MG1bMTVdOiBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE2XTogICAgICAgcGFyYW1ldGVyczpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE3XTogICAgICAgICAtIG5hbWU6IHVzZXJJZFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMThdOiAgICAgICAgICAgaW46IHBhdGhcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE5XTogICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZFx1MDAxYlszOW1cdTAwMWJbMjRtOiB0cnVlXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMF06ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMV06ICAgICAgICAgICBzY2hlbWE6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMl06ICBcdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAxOSxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDMzNyxcbiAgICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxMSxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMzI5LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGlzIGZpZWxkIG11c3QgYmUgb2YgYm9vbGVhbiB0eXBlXCIsXG4gICAgICAgIFwicGF0aFwiOiBcInBhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9nZXQvcGFyYW1ldGVycy8wL3JlcXVpcmVkXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJyZXF1aXJlZFwiOiAxMjMsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgYCk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKFwiY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkc1wiLCAoKSA9PiB7XG4gIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgY3R4LnBhdGggPSBbXG4gICAgXCJwYXRoc1wiLFxuICAgIFwiL3VzZXIve3VzZXJJZH0ve25hbWV9XCIsXG4gICAgXCJnZXRcIixcbiAgICBcInBhcmFtZXRlcnNcIixcbiAgICAwLFxuICAgIFwicmVxdWlyZWRcIlxuICBdO1xuICBjb25zdCBub2RlID0geyByZXF1aXJlZDogMTIzIH07XG4gIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkcyhcbiAgICBbXCJleGFtcGxlXCIsIFwiZXhhbXBsZXNcIl0sXG4gICAgbm9kZSxcbiAgICBjdHhcbiAgKTtcbiAgZXhwZWN0KGVycm9yKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgIE9iamVjdCB7XG4gICAgICBcImNvZGVGcmFtZVwiOiBcIlx1MDAxYls5MG1bMTVdOiBcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVsxNl06ICAgICAgIHBhcmFtZXRlcnM6XHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bMTddOiAgICAgICAgIC0gbmFtZTogdXNlcklkXHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bMThdOiAgICAgICAgICAgaW46IHBhdGhcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVsxOV06ICAgICAgICAgICBcdTAwMWJbNG1cdTAwMWJbMzFtcmVxdWlyZWRcdTAwMWJbMzltXHUwMDFiWzI0bTogdHJ1ZVx1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtWzIwXTogICAgICAgICAgIGRlc2NyaXB0aW9uOiBJZCBvZiBhIHVzZXJcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVsyMV06ICAgICAgICAgICBzY2hlbWE6XHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bMjJdOiAgXHUwMDFiWzM5bVwiLFxuICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgXCJlbmRDb2xcIjogMTksXG4gICAgICAgIFwiZW5kSW5kZXhcIjogMzM3LFxuICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgIFwic3RhcnRDb2xcIjogMTEsXG4gICAgICAgIFwic3RhcnRJbmRleFwiOiAzMjksXG4gICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgfSxcbiAgICAgIFwibWVzc2FnZVwiOiBcImV4YW1wbGUsIGV4YW1wbGVzIGFyZSBtdXR1YWxseSBleGNsdXNpdmVcIixcbiAgICAgIFwicGF0aFwiOiBcInBhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9nZXQvcGFyYW1ldGVycy8wL3JlcXVpcmVkXCIsXG4gICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICBcInJlcXVpcmVkXCI6IDEyMyxcbiAgICAgIH0sXG4gICAgfVxuICBgKTtcbn0pO1xuIl19
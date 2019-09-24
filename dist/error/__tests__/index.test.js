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
        "codeFrame": "
          get:
            summary: Get a list of all users
            description: Also gives their status
            [4m[31mparameters[39m[24m:
              - name: userId
                in: path
       ",
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
        "codeFrame": "
          get:
            summary: Get a list of all users
            description: Also gives their status
            [4m[31mparameters[39m[24m:
              - name: userId
                in: path
       ",
        "file": undefined,
        "location": Object {
          "endCol": 17,
          "endIndex": 275,
          "endLine": 16,
          "startCol": 7,
          "startIndex": 265,
          "startLine": 16,
        },
        "message": "name must be present on this level",
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
        "codeFrame": "
            parameters:
              - name: userId
                in: path
                [4m[31mrequired[39m[24m: true
                description: Id of a user
                schema:
       ",
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
      "codeFrame": "
          parameters:
            - name: userId
              in: path
              [4m[31mrequired[39m[24m: true
              description: Id of a user
              schema:
     ",
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9lcnJvci9fX3Rlc3RzX18vaW5kZXgudGVzdC5qcyJdLCJuYW1lcyI6WyJnZXRTb3VyY2UiLCJmcyIsInJlYWRGaWxlU3luYyIsImNyZWF0ZUNvbnRleHQiLCJkb2N1bWVudCIsInlhbWwiLCJzYWZlTG9hZCIsInBhdGgiLCJwYXRoU3RhY2siLCJzb3VyY2UiLCJlbmFibGVDb2RlZnJhbWUiLCJkZXNjcmliZSIsInRlc3QiLCJjdHgiLCJub2RlIiwicmVxdWlyZWQiLCJlcnJvciIsImV4cGVjdCIsInRvTWF0Y2hJbmxpbmVTbmFwc2hvdCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFDQTs7QUFDQTs7OztBQU9BLE1BQU1BLFNBQVMsR0FBRyxNQUNoQkMsWUFBR0MsWUFBSCxDQUFnQixrQ0FBaEIsRUFBb0QsT0FBcEQsQ0FERjs7QUFHQSxNQUFNQyxhQUFhLEdBQUcsT0FBTztBQUMzQkMsRUFBQUEsUUFBUSxFQUFFQyxnQkFBS0MsUUFBTCxDQUFjTixTQUFTLEVBQXZCLENBRGlCO0FBRTNCTyxFQUFBQSxJQUFJLEVBQUUsQ0FBQyxPQUFELEVBQVUsdUJBQVYsRUFBbUMsS0FBbkMsRUFBMEMsWUFBMUMsQ0FGcUI7QUFHM0JDLEVBQUFBLFNBQVMsRUFBRSxFQUhnQjtBQUkzQkMsRUFBQUEsTUFBTSxFQUFFVCxTQUFTLEVBSlU7QUFLM0JVLEVBQUFBLGVBQWUsRUFBRTtBQUxVLENBQVAsQ0FBdEI7O0FBUUFDLFFBQVEsQ0FBQyw0QkFBRCxFQUErQixNQUFNO0FBQzNDQyxFQUFBQSxJQUFJLENBQUMsRUFBRCxFQUFLLE1BQU07QUFDYixVQUFNQyxHQUFHLEdBQUdWLGFBQWEsRUFBekI7QUFDQSxVQUFNVyxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyxrQ0FBMkIsT0FBM0IsRUFBb0NGLElBQXBDLEVBQTBDRCxHQUExQyxDQUFkO0FBQ0FJLElBQUFBLE1BQU0sQ0FBQ0QsS0FBRCxDQUFOLENBQWNFLHFCQUFkLENBQXFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0tBQXJDO0FBNkJELEdBakNHLENBQUo7QUFrQ0QsQ0FuQ08sQ0FBUjtBQXFDQVAsUUFBUSxDQUFDLGlDQUFELEVBQW9DLE1BQU07QUFDaERDLEVBQUFBLElBQUksQ0FBQyxFQUFELEVBQUssTUFBTTtBQUNiLFVBQU1DLEdBQUcsR0FBR1YsYUFBYSxFQUF6QjtBQUNBLFVBQU1XLElBQUksR0FBRztBQUFFQyxNQUFBQSxRQUFRLEVBQUU7QUFBWixLQUFiO0FBQ0EsVUFBTUMsS0FBSyxHQUFHLHVDQUFnQyxNQUFoQyxFQUF3Q0YsSUFBeEMsRUFBOENELEdBQTlDLENBQWQ7QUFDQUksSUFBQUEsTUFBTSxDQUFDRCxLQUFELENBQU4sQ0FBY0UscUJBQWQsQ0FBcUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7S0FBckM7QUE2QkQsR0FqQ0csQ0FBSjtBQWtDRCxDQW5DTyxDQUFSO0FBcUNBUCxRQUFRLENBQUMsK0JBQUQsRUFBa0MsTUFBTTtBQUM5Q0MsRUFBQUEsSUFBSSxDQUFDLEVBQUQsRUFBSyxNQUFNO0FBQ2IsVUFBTUMsR0FBRyxHQUFHVixhQUFhLEVBQXpCO0FBQ0FVLElBQUFBLEdBQUcsQ0FBQ04sSUFBSixHQUFXLENBQ1QsT0FEUyxFQUVULHVCQUZTLEVBR1QsS0FIUyxFQUlULFlBSlMsRUFLVCxDQUxTLEVBTVQsVUFOUyxDQUFYO0FBUUEsVUFBTU8sSUFBSSxHQUFHO0FBQUVDLE1BQUFBLFFBQVEsRUFBRTtBQUFaLEtBQWI7QUFDQSxVQUFNQyxLQUFLLEdBQUcscUNBQThCLFNBQTlCLEVBQXlDRixJQUF6QyxFQUErQ0QsR0FBL0MsQ0FBZDtBQUNBSSxJQUFBQSxNQUFNLENBQUNELEtBQUQsQ0FBTixDQUFjRSxxQkFBZCxDQUFxQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztLQUFyQztBQTZCRCxHQXpDRyxDQUFKO0FBMENELENBM0NPLENBQVI7QUE2Q0FQLFFBQVEsQ0FBQyxvQ0FBRCxFQUF1QyxNQUFNO0FBQ25ELFFBQU1FLEdBQUcsR0FBR1YsYUFBYSxFQUF6QjtBQUNBVSxFQUFBQSxHQUFHLENBQUNOLElBQUosR0FBVyxDQUNULE9BRFMsRUFFVCx1QkFGUyxFQUdULEtBSFMsRUFJVCxZQUpTLEVBS1QsQ0FMUyxFQU1ULFVBTlMsQ0FBWDtBQVFBLFFBQU1PLElBQUksR0FBRztBQUFFQyxJQUFBQSxRQUFRLEVBQUU7QUFBWixHQUFiO0FBQ0EsUUFBTUMsS0FBSyxHQUFHLDBDQUNaLENBQUMsU0FBRCxFQUFZLFVBQVosQ0FEWSxFQUVaRixJQUZZLEVBR1pELEdBSFksQ0FBZDtBQUtBSSxFQUFBQSxNQUFNLENBQUNELEtBQUQsQ0FBTixDQUFjRSxxQkFBZCxDQUFxQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQUFyQztBQTZCRCxDQTdDTyxDQUFSIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHlhbWwgZnJvbSBcImpzLXlhbWxcIjtcbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCB7XG4gIGNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGQsXG4gIGNyZWF0ZUVycm9yRmllbGROb3RBbGxvd2VkLFxuICBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaCxcbiAgY3JlYXRlRXJyb3JNdXR1YWxseUV4Y2x1c2l2ZUZpZWxkc1xufSBmcm9tIFwiLi5cIjtcblxuY29uc3QgZ2V0U291cmNlID0gKCkgPT5cbiAgZnMucmVhZEZpbGVTeW5jKFwiLi90ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0xLnlhbWxcIiwgXCJ1dGYtOFwiKTtcblxuY29uc3QgY3JlYXRlQ29udGV4dCA9ICgpID0+ICh7XG4gIGRvY3VtZW50OiB5YW1sLnNhZmVMb2FkKGdldFNvdXJjZSgpKSxcbiAgcGF0aDogW1wicGF0aHNcIiwgXCIvdXNlci97dXNlcklkfS97bmFtZX1cIiwgXCJnZXRcIiwgXCJwYXJhbWV0ZXJzXCJdLFxuICBwYXRoU3RhY2s6IFtdLFxuICBzb3VyY2U6IGdldFNvdXJjZSgpLFxuICBlbmFibGVDb2RlZnJhbWU6IHRydWVcbn0pO1xuXG5kZXNjcmliZShcImNyZWF0ZUVycm9yRmllbGROb3RBbGxvd2VkXCIsICgpID0+IHtcbiAgdGVzdChcIlwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yRmllbGROb3RBbGxvd2VkKFwid3JvbmdcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlxuICAgICAgICAgIGdldDpcbiAgICAgICAgICAgIHN1bW1hcnk6IEdldCBhIGxpc3Qgb2YgYWxsIHVzZXJzXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogQWxzbyBnaXZlcyB0aGVpciBzdGF0dXNcbiAgICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1wYXJhbWV0ZXJzXHUwMDFiWzM5bVx1MDAxYlsyNG06XG4gICAgICAgICAgICAgIC0gbmFtZTogdXNlcklkXG4gICAgICAgICAgICAgICAgaW46IHBhdGhcbiAgICAgICBcIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE3LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMjc1LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxNixcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDcsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDI2NSxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAxNixcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwid3JvbmcgaXMgbm90IGFsbG93ZWQgaGVyZS4gVXNlIFxcXFxcIngtXFxcXFwiIHByZWZpeCB0byBvdmVycmlkZSB0aGlzIGJlaGF2aW9yXCIsXG4gICAgICAgIFwicGF0aFwiOiBcInBhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9nZXQvcGFyYW1ldGVyc1wiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwicmVxdWlyZWRcIjogMTIzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIGApO1xuICB9KTtcbn0pO1xuXG5kZXNjcmliZShcImNyZWF0ZUVycm9yTWlzc2luZ1JlcXVpcmVkRmllbGRcIiwgKCkgPT4ge1xuICB0ZXN0KFwiXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3JNaXNzaW5nUmVxdWlyZWRGaWVsZChcIm5hbWVcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlxuICAgICAgICAgIGdldDpcbiAgICAgICAgICAgIHN1bW1hcnk6IEdldCBhIGxpc3Qgb2YgYWxsIHVzZXJzXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogQWxzbyBnaXZlcyB0aGVpciBzdGF0dXNcbiAgICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1wYXJhbWV0ZXJzXHUwMDFiWzM5bVx1MDAxYlsyNG06XG4gICAgICAgICAgICAgIC0gbmFtZTogdXNlcklkXG4gICAgICAgICAgICAgICAgaW46IHBhdGhcbiAgICAgICBcIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE3LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMjc1LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxNixcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDcsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDI2NSxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAxNixcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwibmFtZSBtdXN0IGJlIHByZXNlbnQgb24gdGhpcyBsZXZlbFwiLFxuICAgICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnNcIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcInJlcXVpcmVkXCI6IDEyMyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICBgKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoXCJjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaFwiLCAoKSA9PiB7XG4gIHRlc3QoXCJcIiwgKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgICBjdHgucGF0aCA9IFtcbiAgICAgIFwicGF0aHNcIixcbiAgICAgIFwiL3VzZXIve3VzZXJJZH0ve25hbWV9XCIsXG4gICAgICBcImdldFwiLFxuICAgICAgXCJwYXJhbWV0ZXJzXCIsXG4gICAgICAwLFxuICAgICAgXCJyZXF1aXJlZFwiXG4gICAgXTtcbiAgICBjb25zdCBub2RlID0geyByZXF1aXJlZDogMTIzIH07XG4gICAgY29uc3QgZXJyb3IgPSBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaChcImJvb2xlYW5cIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlxuICAgICAgICAgICAgcGFyYW1ldGVyczpcbiAgICAgICAgICAgICAgLSBuYW1lOiB1c2VySWRcbiAgICAgICAgICAgICAgICBpbjogcGF0aFxuICAgICAgICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZFx1MDAxYlszOW1cdTAwMWJbMjRtOiB0cnVlXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IElkIG9mIGEgdXNlclxuICAgICAgICAgICAgICAgIHNjaGVtYTpcbiAgICAgICBcIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDE5LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMzM3LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxOSxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDExLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAzMjksXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMTksXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcIlRoaXMgZmllbGQgbXVzdCBiZSBvZiBib29sZWFuIHR5cGVcIixcbiAgICAgICAgXCJwYXRoXCI6IFwicGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcInJlcXVpcmVkXCI6IDEyMyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICBgKTtcbiAgfSk7XG59KTtcblxuZGVzY3JpYmUoXCJjcmVhdGVFcnJvck11dHVhbGx5RXhjbHVzaXZlRmllbGRzXCIsICgpID0+IHtcbiAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICBjdHgucGF0aCA9IFtcbiAgICBcInBhdGhzXCIsXG4gICAgXCIvdXNlci97dXNlcklkfS97bmFtZX1cIixcbiAgICBcImdldFwiLFxuICAgIFwicGFyYW1ldGVyc1wiLFxuICAgIDAsXG4gICAgXCJyZXF1aXJlZFwiXG4gIF07XG4gIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgY29uc3QgZXJyb3IgPSBjcmVhdGVFcnJvck11dHVhbGx5RXhjbHVzaXZlRmllbGRzKFxuICAgIFtcImV4YW1wbGVcIiwgXCJleGFtcGxlc1wiXSxcbiAgICBub2RlLFxuICAgIGN0eFxuICApO1xuICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgT2JqZWN0IHtcbiAgICAgIFwiY29kZUZyYW1lXCI6IFwiXG4gICAgICAgICAgcGFyYW1ldGVyczpcbiAgICAgICAgICAgIC0gbmFtZTogdXNlcklkXG4gICAgICAgICAgICAgIGluOiBwYXRoXG4gICAgICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZFx1MDAxYlszOW1cdTAwMWJbMjRtOiB0cnVlXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBJZCBvZiBhIHVzZXJcbiAgICAgICAgICAgICAgc2NoZW1hOlxuICAgICBcIixcbiAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICBcImxvY2F0aW9uXCI6IE9iamVjdCB7XG4gICAgICAgIFwiZW5kQ29sXCI6IDE5LFxuICAgICAgICBcImVuZEluZGV4XCI6IDMzNyxcbiAgICAgICAgXCJlbmRMaW5lXCI6IDE5LFxuICAgICAgICBcInN0YXJ0Q29sXCI6IDExLFxuICAgICAgICBcInN0YXJ0SW5kZXhcIjogMzI5LFxuICAgICAgICBcInN0YXJ0TGluZVwiOiAxOSxcbiAgICAgIH0sXG4gICAgICBcIm1lc3NhZ2VcIjogXCJleGFtcGxlLCBleGFtcGxlcyBhcmUgbXV0dWFsbHkgZXhjbHVzaXZlXCIsXG4gICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFwiLFxuICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgXCJyZXF1aXJlZFwiOiAxMjMsXG4gICAgICB9LFxuICAgIH1cbiAgYCk7XG59KTtcbiJdfQ==
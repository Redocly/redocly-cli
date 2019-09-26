"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _jsYaml = _interopRequireDefault(require("js-yaml"));

var _default = _interopRequireDefault(require("../default"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getSource = () => _fs.default.readFileSync("./test/specs/openapi/test-1.yaml", "utf-8");

const createContext = () => ({
  document: _jsYaml.default.safeLoad(getSource()),
  path: ["paths", "/user/{userId}/{name}", "get", "parameters", 0, "required"],
  pathStack: [],
  source: getSource(),
  enableCodeframe: true
});

describe("createError", () => {
  test("", () => {
    const ctx = createContext();
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m16| [39m
      [90m17|         - name: userId[39m
      [90m18|           in: path[39m
      [90m19|[39m[31m           [4m[31mrequired: true[39m[24m[39m
      [90m20|           description: Id of a user[39m
      [90m21|           schema:[39m",
        "file": undefined,
        "location": Object {
          "endCol": 24,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
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
  test("create error with no codeframe", () => {
    const ctx = createContext();
    ctx.enableCodeframe = false;
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": null,
        "file": undefined,
        "location": Object {
          "endCol": 24,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
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
  test("pretty print error", () => {
    const ctx = createContext();
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m [90mat #/[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m[39m

      test error msg

      [90m16| [39m
      [90m17|         - name: userId[39m
      [90m18|           in: path[39m
      [90m19|[39m[31m           [4m[31mrequired: true[39m[24m[39m
      [90m20|           description: Id of a user[39m
      [90m21|           schema:[39m


      "
    `);
  });
  test("pretty print error without codeframe", () => {
    const ctx = createContext();
    ctx.enableCodeframe = false;
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m [90mat #/[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m[39m

      test error msg


      "
    `);
  });
  test("create error with path stack", () => {
    const ctx = createContext();
    ctx.pathStack = [{
      path: ["paths"],
      file: "test/specs/openapi/test-1.yaml"
    }];
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m16| [39m
      [90m17|         - name: userId[39m
      [90m18|           in: path[39m
      [90m19|[39m[31m           [4m[31mrequired: true[39m[24m[39m
      [90m20|           description: Id of a user[39m
      [90m21|           schema:[39m",
        "file": undefined,
        "location": Object {
          "endCol": 24,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
        "path": "[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m",
        "pathStack": Array [
          "[94mtest/specs/openapi/test-1.yaml:11[39m [90m#/paths[39m",
        ],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "required": 123,
        },
      }
    `);
  });
  test("pretty print error with path stack", () => {
    const ctx = createContext();
    ctx.pathStack = [{
      path: ["paths", "/user/{userId}/{name}", "get", "parameters", 0, "required"],
      file: "test/specs/openapi/test-1.yaml"
    }];
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m [90mat #/[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m[39m
        from [94mtest/specs/openapi/test-1.yaml:19[39m [90m#/paths//user/{userId}/{name}/get/parameters/0/required[39m

      test error msg

      [90m16| [39m
      [90m17|         - name: userId[39m
      [90m18|           in: path[39m
      [90m19|[39m[31m           [4m[31mrequired: true[39m[24m[39m
      [90m20|           description: Id of a user[39m
      [90m21|           schema:[39m


      "
    `);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9lcnJvci9fX3Rlc3RzX18vZGVmYXVsdC50ZXN0LmpzIl0sIm5hbWVzIjpbImdldFNvdXJjZSIsImZzIiwicmVhZEZpbGVTeW5jIiwiY3JlYXRlQ29udGV4dCIsImRvY3VtZW50IiwieWFtbCIsInNhZmVMb2FkIiwicGF0aCIsInBhdGhTdGFjayIsInNvdXJjZSIsImVuYWJsZUNvZGVmcmFtZSIsImRlc2NyaWJlIiwidGVzdCIsImN0eCIsIm5vZGUiLCJyZXF1aXJlZCIsImVycm9yIiwiZXhwZWN0IiwidG9NYXRjaElubGluZVNuYXBzaG90IiwicHJldHR5UHJpbnQiLCJmaWxlIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUNBOztBQUNBOzs7O0FBRUEsTUFBTUEsU0FBUyxHQUFHLE1BQ2hCQyxZQUFHQyxZQUFILENBQWdCLGtDQUFoQixFQUFvRCxPQUFwRCxDQURGOztBQUdBLE1BQU1DLGFBQWEsR0FBRyxPQUFPO0FBQzNCQyxFQUFBQSxRQUFRLEVBQUVDLGdCQUFLQyxRQUFMLENBQWNOLFNBQVMsRUFBdkIsQ0FEaUI7QUFFM0JPLEVBQUFBLElBQUksRUFBRSxDQUFDLE9BQUQsRUFBVSx1QkFBVixFQUFtQyxLQUFuQyxFQUEwQyxZQUExQyxFQUF3RCxDQUF4RCxFQUEyRCxVQUEzRCxDQUZxQjtBQUczQkMsRUFBQUEsU0FBUyxFQUFFLEVBSGdCO0FBSTNCQyxFQUFBQSxNQUFNLEVBQUVULFNBQVMsRUFKVTtBQUszQlUsRUFBQUEsZUFBZSxFQUFFO0FBTFUsQ0FBUCxDQUF0Qjs7QUFRQUMsUUFBUSxDQUFDLGFBQUQsRUFBZ0IsTUFBTTtBQUM1QkMsRUFBQUEsSUFBSSxDQUFDLEVBQUQsRUFBSyxNQUFNO0FBQ2IsVUFBTUMsR0FBRyxHQUFHVixhQUFhLEVBQXpCO0FBQ0EsVUFBTVcsSUFBSSxHQUFHO0FBQUVDLE1BQUFBLFFBQVEsRUFBRTtBQUFaLEtBQWI7QUFDQSxVQUFNQyxLQUFLLEdBQUcsc0JBQVksZ0JBQVosRUFBOEJGLElBQTlC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RixJQUE5QixFQUFvQ0QsR0FBcEMsQ0FBZDtBQUNBSSxJQUFBQSxNQUFNLENBQUNELEtBQUssQ0FBQ0csV0FBTixFQUFELENBQU4sQ0FBNEJELHFCQUE1QixDQUFtRDs7Ozs7Ozs7Ozs7Ozs7O0tBQW5EO0FBZ0JELEdBakNHLENBQUo7QUFrQ0QsQ0E5S08sQ0FBUiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCB5YW1sIGZyb20gXCJqcy15YW1sXCI7XG5pbXBvcnQgY3JlYXRlRXJyb3IgZnJvbSBcIi4uL2RlZmF1bHRcIjtcblxuY29uc3QgZ2V0U291cmNlID0gKCkgPT5cbiAgZnMucmVhZEZpbGVTeW5jKFwiLi90ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0xLnlhbWxcIiwgXCJ1dGYtOFwiKTtcblxuY29uc3QgY3JlYXRlQ29udGV4dCA9ICgpID0+ICh7XG4gIGRvY3VtZW50OiB5YW1sLnNhZmVMb2FkKGdldFNvdXJjZSgpKSxcbiAgcGF0aDogW1wicGF0aHNcIiwgXCIvdXNlci97dXNlcklkfS97bmFtZX1cIiwgXCJnZXRcIiwgXCJwYXJhbWV0ZXJzXCIsIDAsIFwicmVxdWlyZWRcIl0sXG4gIHBhdGhTdGFjazogW10sXG4gIHNvdXJjZTogZ2V0U291cmNlKCksXG4gIGVuYWJsZUNvZGVmcmFtZTogdHJ1ZVxufSk7XG5cbmRlc2NyaWJlKFwiY3JlYXRlRXJyb3JcIiwgKCkgPT4ge1xuICB0ZXN0KFwiXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoXCJ0ZXN0IGVycm9yIG1zZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvcikudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbTE2fCBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTd8ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTh8ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG0xOXxcdTAwMWJbMzltXHUwMDFiWzMxbSAgICAgICAgICAgXHUwMDFiWzRtXHUwMDFiWzMxbXJlcXVpcmVkOiB0cnVlXHUwMDFiWzM5bVx1MDAxYlsyNG1cdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMjB8ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbTIxfCAgICAgICAgICAgc2NoZW1hOlx1MDAxYlszOW1cIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDI0LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMzQzLFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxOSxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDExLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAzMjksXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMTksXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcInRlc3QgZXJyb3IgbXNnXCIsXG4gICAgICAgIFwicGF0aFwiOiBcIlx1MDAxYls5MG1wYXRoc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtWydcdTAwMWJbMzltXHUwMDFiWzk0bS91c2VyL3t1c2VySWR9L3tuYW1lfVx1MDAxYlszOW1cdTAwMWJbOTBtJ11cdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbWdldFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcGFyYW1ldGVyc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtMFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcmVxdWlyZWRcdTAwMWJbMzltXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJyZXF1aXJlZFwiOiAxMjMsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgYCk7XG4gIH0pO1xuXG4gIHRlc3QoXCJjcmVhdGUgZXJyb3Igd2l0aCBubyBjb2RlZnJhbWVcIiwgKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgICBjdHguZW5hYmxlQ29kZWZyYW1lID0gZmFsc2U7XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoXCJ0ZXN0IGVycm9yIG1zZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvcikudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IG51bGwsXG4gICAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAyNCxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDM0MyxcbiAgICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxMSxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMzI5LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJ0ZXN0IGVycm9yIG1zZ1wiLFxuICAgICAgICBcInBhdGhcIjogXCJcdTAwMWJbOTBtcGF0aHNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbVsnXHUwMDFiWzM5bVx1MDAxYls5NG0vdXNlci97dXNlcklkfS97bmFtZX1cdTAwMWJbMzltXHUwMDFiWzkwbSddXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1nZXRcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXBhcmFtZXRlcnNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbTBcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXJlcXVpcmVkXHUwMDFiWzM5bVwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwicmVxdWlyZWRcIjogMTIzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwicHJldHR5IHByaW50IGVycm9yXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoXCJ0ZXN0IGVycm9yIG1zZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvci5wcmV0dHlQcmludCgpKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgICAgXCJcdTAwMWJbNDFtdW5kZWZpbmVkOjE5OjExXHUwMDFiWzQ5bSBcdTAwMWJbOTBtYXQgIy9cdTAwMWJbOTBtcGF0aHNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbVsnXHUwMDFiWzM5bVx1MDAxYls5NG0vdXNlci97dXNlcklkfS97bmFtZX1cdTAwMWJbMzltXHUwMDFiWzkwbSddXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1nZXRcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXBhcmFtZXRlcnNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbTBcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXJlcXVpcmVkXHUwMDFiWzM5bVx1MDAxYlszOW1cblxuICAgICAgdGVzdCBlcnJvciBtc2dcblxuICAgICAgXHUwMDFiWzkwbTE2fCBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTd8ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTh8ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG0xOXxcdTAwMWJbMzltXHUwMDFiWzMxbSAgICAgICAgICAgXHUwMDFiWzRtXHUwMDFiWzMxbXJlcXVpcmVkOiB0cnVlXHUwMDFiWzM5bVx1MDAxYlsyNG1cdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMjB8ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbTIxfCAgICAgICAgICAgc2NoZW1hOlx1MDAxYlszOW1cblxuXG4gICAgICBcIlxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwicHJldHR5IHByaW50IGVycm9yIHdpdGhvdXQgY29kZWZyYW1lXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY3R4LmVuYWJsZUNvZGVmcmFtZSA9IGZhbHNlO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IucHJldHR5UHJpbnQoKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIFwiXHUwMDFiWzQxbXVuZGVmaW5lZDoxOToxMVx1MDAxYls0OW0gXHUwMDFiWzkwbWF0ICMvXHUwMDFiWzkwbXBhdGhzXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1bJ1x1MDAxYlszOW1cdTAwMWJbOTRtL3VzZXIve3VzZXJJZH0ve25hbWV9XHUwMDFiWzM5bVx1MDAxYls5MG0nXVx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtZ2V0XHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1wYXJhbWV0ZXJzXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG0wXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1yZXF1aXJlZFx1MDAxYlszOW1cdTAwMWJbMzltXG5cbiAgICAgIHRlc3QgZXJyb3IgbXNnXG5cblxuICAgICAgXCJcbiAgICBgKTtcbiAgfSk7XG5cbiAgdGVzdChcImNyZWF0ZSBlcnJvciB3aXRoIHBhdGggc3RhY2tcIiwgKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgICBjdHgucGF0aFN0YWNrID0gW1xuICAgICAge1xuICAgICAgICBwYXRoOiBbXCJwYXRoc1wiXSxcbiAgICAgICAgZmlsZTogXCJ0ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0xLnlhbWxcIlxuICAgICAgfVxuICAgIF07XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoXCJ0ZXN0IGVycm9yIG1zZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvcikudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbTE2fCBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTd8ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTh8ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG0xOXxcdTAwMWJbMzltXHUwMDFiWzMxbSAgICAgICAgICAgXHUwMDFiWzRtXHUwMDFiWzMxbXJlcXVpcmVkOiB0cnVlXHUwMDFiWzM5bVx1MDAxYlsyNG1cdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMjB8ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbTIxfCAgICAgICAgICAgc2NoZW1hOlx1MDAxYlszOW1cIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDI0LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMzQzLFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxOSxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDExLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAzMjksXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMTksXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcInRlc3QgZXJyb3IgbXNnXCIsXG4gICAgICAgIFwicGF0aFwiOiBcIlx1MDAxYls5MG1wYXRoc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtWydcdTAwMWJbMzltXHUwMDFiWzk0bS91c2VyL3t1c2VySWR9L3tuYW1lfVx1MDAxYlszOW1cdTAwMWJbOTBtJ11cdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbWdldFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcGFyYW1ldGVyc1x1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtMFx1MDAxYlszOW1cdTAwMWJbOTBtL1x1MDAxYlszOW1cdTAwMWJbOTBtcmVxdWlyZWRcdTAwMWJbMzltXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtcbiAgICAgICAgICBcIlx1MDAxYls5NG10ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0xLnlhbWw6MTFcdTAwMWJbMzltIFx1MDAxYls5MG0jL3BhdGhzXHUwMDFiWzM5bVwiLFxuICAgICAgICBdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJyZXF1aXJlZFwiOiAxMjMsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgYCk7XG4gIH0pO1xuXG4gIHRlc3QoXCJwcmV0dHkgcHJpbnQgZXJyb3Igd2l0aCBwYXRoIHN0YWNrXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY3R4LnBhdGhTdGFjayA9IFtcbiAgICAgIHtcbiAgICAgICAgcGF0aDogW1xuICAgICAgICAgIFwicGF0aHNcIixcbiAgICAgICAgICBcIi91c2VyL3t1c2VySWR9L3tuYW1lfVwiLFxuICAgICAgICAgIFwiZ2V0XCIsXG4gICAgICAgICAgXCJwYXJhbWV0ZXJzXCIsXG4gICAgICAgICAgMCxcbiAgICAgICAgICBcInJlcXVpcmVkXCJcbiAgICAgICAgXSxcbiAgICAgICAgZmlsZTogXCJ0ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0xLnlhbWxcIlxuICAgICAgfVxuICAgIF07XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoXCJ0ZXN0IGVycm9yIG1zZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvci5wcmV0dHlQcmludCgpKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgICAgXCJcdTAwMWJbNDFtdW5kZWZpbmVkOjE5OjExXHUwMDFiWzQ5bSBcdTAwMWJbOTBtYXQgIy9cdTAwMWJbOTBtcGF0aHNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbVsnXHUwMDFiWzM5bVx1MDAxYls5NG0vdXNlci97dXNlcklkfS97bmFtZX1cdTAwMWJbMzltXHUwMDFiWzkwbSddXHUwMDFiWzM5bVx1MDAxYls5MG0vXHUwMDFiWzM5bVx1MDAxYls5MG1nZXRcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXBhcmFtZXRlcnNcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbTBcdTAwMWJbMzltXHUwMDFiWzkwbS9cdTAwMWJbMzltXHUwMDFiWzkwbXJlcXVpcmVkXHUwMDFiWzM5bVx1MDAxYlszOW1cbiAgICAgICAgZnJvbSBcdTAwMWJbOTRtdGVzdC9zcGVjcy9vcGVuYXBpL3Rlc3QtMS55YW1sOjE5XHUwMDFiWzM5bSBcdTAwMWJbOTBtIy9wYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFx1MDAxYlszOW1cblxuICAgICAgdGVzdCBlcnJvciBtc2dcblxuICAgICAgXHUwMDFiWzkwbTE2fCBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTd8ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMTh8ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG0xOXxcdTAwMWJbMzltXHUwMDFiWzMxbSAgICAgICAgICAgXHUwMDFiWzRtXHUwMDFiWzMxbXJlcXVpcmVkOiB0cnVlXHUwMDFiWzM5bVx1MDAxYlsyNG1cdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtMjB8ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbTIxfCAgICAgICAgICAgc2NoZW1hOlx1MDAxYlszOW1cblxuXG4gICAgICBcIlxuICAgIGApO1xuICB9KTtcbn0pO1xuIl19
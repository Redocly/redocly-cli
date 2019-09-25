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
        "codeFrame": "[90m[15]: [39m
      [90m[16]:       parameters:[39m
      [90m[17]:         - name: userId[39m
      [90m[18]:           in: path[39m
      [90m[19]:           [4m[31mrequired: true[39m[24m[39m
      [90m[20]:           description: Id of a user[39m
      [90m[21]:           schema:[39m
      [90m[22]:  [39m",
        "file": undefined,
        "location": Object {
          "endCol": 25,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
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
          "endCol": 25,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
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
  test("pretty print error", () => {
    const ctx = createContext();
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m
      test error msg by path [94m#/paths//user/{userId}/{name}/get/parameters/0/required[39m

      [90m[15]: [39m
      [90m[16]:       parameters:[39m
      [90m[17]:         - name: userId[39m
      [90m[18]:           in: path[39m
      [90m[19]:           [4m[31mrequired: true[39m[24m[39m
      [90m[20]:           description: Id of a user[39m
      [90m[21]:           schema:[39m
      [90m[22]:  [39m
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
      "[41mundefined:19:11[49m
      test error msg by path [94m#/paths//user/{userId}/{name}/get/parameters/0/required[39m
      "
    `);
  });
  test("create error with path stack", () => {
    const ctx = createContext();
    ctx.pathStack = [{
      path: ["paths", "/user/{userId}/{name}", "post", "parameters", 0, "required"],
      file: "src/example.yaml"
    }];
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m[15]: [39m
      [90m[16]:       parameters:[39m
      [90m[17]:         - name: userId[39m
      [90m[18]:           in: path[39m
      [90m[19]:           [4m[31mrequired: true[39m[24m[39m
      [90m[20]:           description: Id of a user[39m
      [90m[21]:           schema:[39m
      [90m[22]:  [39m",
        "file": undefined,
        "location": Object {
          "endCol": 25,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
        "path": "paths//user/{userId}/{name}/get/parameters/0/required",
        "pathStack": Array [
          "src/example.yaml#/paths//user/{userId}/{name}/post/parameters/0/required",
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
      path: ["paths", "/user/{userId}/{name}", "post", "parameters", 0, "required"],
      file: "src/example.yaml"
    }];
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m
      test error msg by path [94m#/paths//user/{userId}/{name}/get/parameters/0/required[39m

      Error referenced from:[94m
      - src/example.yaml#/paths//user/{userId}/{name}/post/parameters/0/required
      [39m
      [90m[15]: [39m
      [90m[16]:       parameters:[39m
      [90m[17]:         - name: userId[39m
      [90m[18]:           in: path[39m
      [90m[19]:           [4m[31mrequired: true[39m[24m[39m
      [90m[20]:           description: Id of a user[39m
      [90m[21]:           schema:[39m
      [90m[22]:  [39m
      "
    `);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9lcnJvci9fX3Rlc3RzX18vZGVmYXVsdC50ZXN0LmpzIl0sIm5hbWVzIjpbImdldFNvdXJjZSIsImZzIiwicmVhZEZpbGVTeW5jIiwiY3JlYXRlQ29udGV4dCIsImRvY3VtZW50IiwieWFtbCIsInNhZmVMb2FkIiwicGF0aCIsInBhdGhTdGFjayIsInNvdXJjZSIsImVuYWJsZUNvZGVmcmFtZSIsImRlc2NyaWJlIiwidGVzdCIsImN0eCIsIm5vZGUiLCJyZXF1aXJlZCIsImVycm9yIiwiZXhwZWN0IiwidG9NYXRjaElubGluZVNuYXBzaG90IiwicHJldHR5UHJpbnQiLCJmaWxlIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUNBOztBQUNBOzs7O0FBRUEsTUFBTUEsU0FBUyxHQUFHLE1BQ2hCQyxZQUFHQyxZQUFILENBQWdCLGtDQUFoQixFQUFvRCxPQUFwRCxDQURGOztBQUdBLE1BQU1DLGFBQWEsR0FBRyxPQUFPO0FBQzNCQyxFQUFBQSxRQUFRLEVBQUVDLGdCQUFLQyxRQUFMLENBQWNOLFNBQVMsRUFBdkIsQ0FEaUI7QUFFM0JPLEVBQUFBLElBQUksRUFBRSxDQUFDLE9BQUQsRUFBVSx1QkFBVixFQUFtQyxLQUFuQyxFQUEwQyxZQUExQyxFQUF3RCxDQUF4RCxFQUEyRCxVQUEzRCxDQUZxQjtBQUczQkMsRUFBQUEsU0FBUyxFQUFFLEVBSGdCO0FBSTNCQyxFQUFBQSxNQUFNLEVBQUVULFNBQVMsRUFKVTtBQUszQlUsRUFBQUEsZUFBZSxFQUFFO0FBTFUsQ0FBUCxDQUF0Qjs7QUFRQUMsUUFBUSxDQUFDLGFBQUQsRUFBZ0IsTUFBTTtBQUM1QkMsRUFBQUEsSUFBSSxDQUFDLEVBQUQsRUFBSyxNQUFNO0FBQ2IsVUFBTUMsR0FBRyxHQUFHVixhQUFhLEVBQXpCO0FBQ0EsVUFBTVcsSUFBSSxHQUFHO0FBQUVDLE1BQUFBLFFBQVEsRUFBRTtBQUFaLEtBQWI7QUFDQSxVQUFNQyxLQUFLLEdBQUcsc0JBQVksZ0JBQVosRUFBOEJGLElBQTlC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QUU7QUFBWixLQUFiO0FBQ0EsVUFBTUMsS0FBSyxHQUFHLHNCQUFZLGdCQUFaLEVBQThCRixJQUE5QixFQUFvQ0QsR0FBcEMsQ0FBZDtBQUNBSSxJQUFBQSxNQUFNLENBQUNELEtBQUssQ0FBQ0csV0FBTixFQUFELENBQU4sQ0FBNEJELHFCQUE1QixDQUFtRDs7Ozs7Ozs7Ozs7Ozs7OztLQUFuRDtBQWlCRCxHQWxDRyxDQUFKO0FBbUNELENBdExPLENBQVIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeWFtbCBmcm9tIFwianMteWFtbFwiO1xuaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gXCIuLi9kZWZhdWx0XCI7XG5cbmNvbnN0IGdldFNvdXJjZSA9ICgpID0+XG4gIGZzLnJlYWRGaWxlU3luYyhcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3Rlc3QtMS55YW1sXCIsIFwidXRmLThcIik7XG5cbmNvbnN0IGNyZWF0ZUNvbnRleHQgPSAoKSA9PiAoe1xuICBkb2N1bWVudDogeWFtbC5zYWZlTG9hZChnZXRTb3VyY2UoKSksXG4gIHBhdGg6IFtcInBhdGhzXCIsIFwiL3VzZXIve3VzZXJJZH0ve25hbWV9XCIsIFwiZ2V0XCIsIFwicGFyYW1ldGVyc1wiLCAwLCBcInJlcXVpcmVkXCJdLFxuICBwYXRoU3RhY2s6IFtdLFxuICBzb3VyY2U6IGdldFNvdXJjZSgpLFxuICBlbmFibGVDb2RlZnJhbWU6IHRydWVcbn0pO1xuXG5kZXNjcmliZShcImNyZWF0ZUVycm9yXCIsICgpID0+IHtcbiAgdGVzdChcIlwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlx1MDAxYls5MG1bMTVdOiBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE2XTogICAgICAgcGFyYW1ldGVyczpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE3XTogICAgICAgICAtIG5hbWU6IHVzZXJJZFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMThdOiAgICAgICAgICAgaW46IHBhdGhcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE5XTogICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZDogdHJ1ZVx1MDAxYlszOW1cdTAwMWJbMjRtXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMF06ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMV06ICAgICAgICAgICBzY2hlbWE6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMl06ICBcdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAyNSxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDM0MyxcbiAgICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxMSxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMzI5LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJ0ZXN0IGVycm9yIG1zZ1wiLFxuICAgICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwicmVxdWlyZWRcIjogMTIzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwiY3JlYXRlIGVycm9yIHdpdGggbm8gY29kZWZyYW1lXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY3R4LmVuYWJsZUNvZGVmcmFtZSA9IGZhbHNlO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBudWxsLFxuICAgICAgICBcImZpbGVcIjogdW5kZWZpbmVkLFxuICAgICAgICBcImxvY2F0aW9uXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJlbmRDb2xcIjogMjUsXG4gICAgICAgICAgXCJlbmRJbmRleFwiOiAzNDMsXG4gICAgICAgICAgXCJlbmRMaW5lXCI6IDE5LFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogMTEsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDMyOSxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAxOSxcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwidGVzdCBlcnJvciBtc2dcIixcbiAgICAgICAgXCJwYXRoXCI6IFwicGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcInJlcXVpcmVkXCI6IDEyMyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICBgKTtcbiAgfSk7XG5cbiAgdGVzdChcInByZXR0eSBwcmludCBlcnJvclwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IucHJldHR5UHJpbnQoKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIFwiXHUwMDFiWzQxbXVuZGVmaW5lZDoxOToxMVx1MDAxYls0OW1cbiAgICAgIHRlc3QgZXJyb3IgbXNnIGJ5IHBhdGggXHUwMDFiWzk0bSMvcGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcdTAwMWJbMzltXG5cbiAgICAgIFx1MDAxYls5MG1bMTVdOiBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE2XTogICAgICAgcGFyYW1ldGVyczpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE3XTogICAgICAgICAtIG5hbWU6IHVzZXJJZFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMThdOiAgICAgICAgICAgaW46IHBhdGhcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE5XTogICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZDogdHJ1ZVx1MDAxYlszOW1cdTAwMWJbMjRtXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMF06ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMV06ICAgICAgICAgICBzY2hlbWE6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMl06ICBcdTAwMWJbMzltXG4gICAgICBcIlxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwicHJldHR5IHByaW50IGVycm9yIHdpdGhvdXQgY29kZWZyYW1lXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY3R4LmVuYWJsZUNvZGVmcmFtZSA9IGZhbHNlO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IucHJldHR5UHJpbnQoKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIFwiXHUwMDFiWzQxbXVuZGVmaW5lZDoxOToxMVx1MDAxYls0OW1cbiAgICAgIHRlc3QgZXJyb3IgbXNnIGJ5IHBhdGggXHUwMDFiWzk0bSMvcGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcdTAwMWJbMzltXG4gICAgICBcIlxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwiY3JlYXRlIGVycm9yIHdpdGggcGF0aCBzdGFja1wiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGN0eC5wYXRoU3RhY2sgPSBbXG4gICAgICB7XG4gICAgICAgIHBhdGg6IFtcbiAgICAgICAgICBcInBhdGhzXCIsXG4gICAgICAgICAgXCIvdXNlci97dXNlcklkfS97bmFtZX1cIixcbiAgICAgICAgICBcInBvc3RcIixcbiAgICAgICAgICBcInBhcmFtZXRlcnNcIixcbiAgICAgICAgICAwLFxuICAgICAgICAgIFwicmVxdWlyZWRcIlxuICAgICAgICBdLFxuICAgICAgICBmaWxlOiBcInNyYy9leGFtcGxlLnlhbWxcIlxuICAgICAgfVxuICAgIF07XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoXCJ0ZXN0IGVycm9yIG1zZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvcikudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbVsxNV06IFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMTZdOiAgICAgICBwYXJhbWV0ZXJzOlx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMTddOiAgICAgICAgIC0gbmFtZTogdXNlcklkXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxOF06ICAgICAgICAgICBpbjogcGF0aFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMTldOiAgICAgICAgICAgXHUwMDFiWzRtXHUwMDFiWzMxbXJlcXVpcmVkOiB0cnVlXHUwMDFiWzM5bVx1MDAxYlsyNG1cdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzIwXTogICAgICAgICAgIGRlc2NyaXB0aW9uOiBJZCBvZiBhIHVzZXJcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzIxXTogICAgICAgICAgIHNjaGVtYTpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzIyXTogIFx1MDAxYlszOW1cIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDI1LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMzQzLFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxOSxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDExLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAzMjksXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMTksXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcInRlc3QgZXJyb3IgbXNnXCIsXG4gICAgICAgIFwicGF0aFwiOiBcInBhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9nZXQvcGFyYW1ldGVycy8wL3JlcXVpcmVkXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtcbiAgICAgICAgICBcInNyYy9leGFtcGxlLnlhbWwjL3BhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9wb3N0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFwiLFxuICAgICAgICBdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJyZXF1aXJlZFwiOiAxMjMsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgYCk7XG4gIH0pO1xuXG4gIHRlc3QoXCJwcmV0dHkgcHJpbnQgZXJyb3Igd2l0aCBwYXRoIHN0YWNrXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY3R4LnBhdGhTdGFjayA9IFtcbiAgICAgIHtcbiAgICAgICAgcGF0aDogW1xuICAgICAgICAgIFwicGF0aHNcIixcbiAgICAgICAgICBcIi91c2VyL3t1c2VySWR9L3tuYW1lfVwiLFxuICAgICAgICAgIFwicG9zdFwiLFxuICAgICAgICAgIFwicGFyYW1ldGVyc1wiLFxuICAgICAgICAgIDAsXG4gICAgICAgICAgXCJyZXF1aXJlZFwiXG4gICAgICAgIF0sXG4gICAgICAgIGZpbGU6IFwic3JjL2V4YW1wbGUueWFtbFwiXG4gICAgICB9XG4gICAgXTtcbiAgICBjb25zdCBub2RlID0geyByZXF1aXJlZDogMTIzIH07XG4gICAgY29uc3QgZXJyb3IgPSBjcmVhdGVFcnJvcihcInRlc3QgZXJyb3IgbXNnXCIsIG5vZGUsIGN0eCk7XG4gICAgZXhwZWN0KGVycm9yLnByZXR0eVByaW50KCkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBcIlx1MDAxYls0MW11bmRlZmluZWQ6MTk6MTFcdTAwMWJbNDltXG4gICAgICB0ZXN0IGVycm9yIG1zZyBieSBwYXRoIFx1MDAxYls5NG0jL3BhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9nZXQvcGFyYW1ldGVycy8wL3JlcXVpcmVkXHUwMDFiWzM5bVxuXG4gICAgICBFcnJvciByZWZlcmVuY2VkIGZyb206XHUwMDFiWzk0bVxuICAgICAgLSBzcmMvZXhhbXBsZS55YW1sIy9wYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vcG9zdC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcbiAgICAgIFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMTVdOiBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE2XTogICAgICAgcGFyYW1ldGVyczpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE3XTogICAgICAgICAtIG5hbWU6IHVzZXJJZFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMThdOiAgICAgICAgICAgaW46IHBhdGhcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE5XTogICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZDogdHJ1ZVx1MDAxYlszOW1cdTAwMWJbMjRtXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMF06ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMV06ICAgICAgICAgICBzY2hlbWE6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMl06ICBcdTAwMWJbMzltXG4gICAgICBcIlxuICAgIGApO1xuICB9KTtcbn0pO1xuIl19
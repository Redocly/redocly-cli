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
    ctx.pathStack = [["paths", "/user/{userId}/{name}", "post", "parameters", 0, "required"]];
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
          "paths//user/{userId}/{name}/post/parameters/0/required",
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
    ctx.pathStack = [["paths", "/user/{userId}/{name}", "post", "parameters", 0, "required"]];
    const node = {
      required: 123
    };
    const error = (0, _default.default)("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m
      test error msg by path [94m#/paths//user/{userId}/{name}/get/parameters/0/required[39m

      Error referenced from:[94m
      - #/paths//user/{userId}/{name}/post/parameters/0/required
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9lcnJvci9fX3Rlc3RzX18vZGVmYXVsdC50ZXN0LmpzIl0sIm5hbWVzIjpbImdldFNvdXJjZSIsImZzIiwicmVhZEZpbGVTeW5jIiwiY3JlYXRlQ29udGV4dCIsImRvY3VtZW50IiwieWFtbCIsInNhZmVMb2FkIiwicGF0aCIsInBhdGhTdGFjayIsInNvdXJjZSIsImVuYWJsZUNvZGVmcmFtZSIsImRlc2NyaWJlIiwidGVzdCIsImN0eCIsIm5vZGUiLCJyZXF1aXJlZCIsImVycm9yIiwiZXhwZWN0IiwidG9NYXRjaElubGluZVNuYXBzaG90IiwicHJldHR5UHJpbnQiXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBQ0E7O0FBQ0E7Ozs7QUFFQSxNQUFNQSxTQUFTLEdBQUcsTUFDaEJDLFlBQUdDLFlBQUgsQ0FBZ0Isa0NBQWhCLEVBQW9ELE9BQXBELENBREY7O0FBR0EsTUFBTUMsYUFBYSxHQUFHLE9BQU87QUFDM0JDLEVBQUFBLFFBQVEsRUFBRUMsZ0JBQUtDLFFBQUwsQ0FBY04sU0FBUyxFQUF2QixDQURpQjtBQUUzQk8sRUFBQUEsSUFBSSxFQUFFLENBQUMsT0FBRCxFQUFVLHVCQUFWLEVBQW1DLEtBQW5DLEVBQTBDLFlBQTFDLEVBQXdELENBQXhELEVBQTJELFVBQTNELENBRnFCO0FBRzNCQyxFQUFBQSxTQUFTLEVBQUUsRUFIZ0I7QUFJM0JDLEVBQUFBLE1BQU0sRUFBRVQsU0FBUyxFQUpVO0FBSzNCVSxFQUFBQSxlQUFlLEVBQUU7QUFMVSxDQUFQLENBQXRCOztBQVFBQyxRQUFRLENBQUMsYUFBRCxFQUFnQixNQUFNO0FBQzVCQyxFQUFBQSxJQUFJLENBQUMsRUFBRCxFQUFLLE1BQU07QUFDYixVQUFNQyxHQUFHLEdBQUdWLGFBQWEsRUFBekI7QUFDQSxVQUFNVyxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyxzQkFBWSxnQkFBWixFQUE4QkYsSUFBOUIsRUFBb0NE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LEtBQUssQ0FBQ0csV0FBTixFQUFELENBQU4sQ0FBNEJELHFCQUE1QixDQUFtRDs7Ozs7Ozs7Ozs7Ozs7OztLQUFuRDtBQWlCRCxHQXhCRyxDQUFKO0FBeUJELENBbEtPLENBQVIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeWFtbCBmcm9tIFwianMteWFtbFwiO1xuaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gXCIuLi9kZWZhdWx0XCI7XG5cbmNvbnN0IGdldFNvdXJjZSA9ICgpID0+XG4gIGZzLnJlYWRGaWxlU3luYyhcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3Rlc3QtMS55YW1sXCIsIFwidXRmLThcIik7XG5cbmNvbnN0IGNyZWF0ZUNvbnRleHQgPSAoKSA9PiAoe1xuICBkb2N1bWVudDogeWFtbC5zYWZlTG9hZChnZXRTb3VyY2UoKSksXG4gIHBhdGg6IFtcInBhdGhzXCIsIFwiL3VzZXIve3VzZXJJZH0ve25hbWV9XCIsIFwiZ2V0XCIsIFwicGFyYW1ldGVyc1wiLCAwLCBcInJlcXVpcmVkXCJdLFxuICBwYXRoU3RhY2s6IFtdLFxuICBzb3VyY2U6IGdldFNvdXJjZSgpLFxuICBlbmFibGVDb2RlZnJhbWU6IHRydWVcbn0pO1xuXG5kZXNjcmliZShcImNyZWF0ZUVycm9yXCIsICgpID0+IHtcbiAgdGVzdChcIlwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlx1MDAxYls5MG1bMTVdOiBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE2XTogICAgICAgcGFyYW1ldGVyczpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE3XTogICAgICAgICAtIG5hbWU6IHVzZXJJZFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMThdOiAgICAgICAgICAgaW46IHBhdGhcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE5XTogICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZDogdHJ1ZVx1MDAxYlszOW1cdTAwMWJbMjRtXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMF06ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMV06ICAgICAgICAgICBzY2hlbWE6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMl06ICBcdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAyNSxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDM0MyxcbiAgICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxMSxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMzI5LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJ0ZXN0IGVycm9yIG1zZ1wiLFxuICAgICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwicmVxdWlyZWRcIjogMTIzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwiY3JlYXRlIGVycm9yIHdpdGggbm8gY29kZWZyYW1lXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY3R4LmVuYWJsZUNvZGVmcmFtZSA9IGZhbHNlO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBudWxsLFxuICAgICAgICBcImZpbGVcIjogdW5kZWZpbmVkLFxuICAgICAgICBcImxvY2F0aW9uXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJlbmRDb2xcIjogMjUsXG4gICAgICAgICAgXCJlbmRJbmRleFwiOiAzNDMsXG4gICAgICAgICAgXCJlbmRMaW5lXCI6IDE5LFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogMTEsXG4gICAgICAgICAgXCJzdGFydEluZGV4XCI6IDMyOSxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAxOSxcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwidGVzdCBlcnJvciBtc2dcIixcbiAgICAgICAgXCJwYXRoXCI6IFwicGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcInJlcXVpcmVkXCI6IDEyMyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICBgKTtcbiAgfSk7XG5cbiAgdGVzdChcInByZXR0eSBwcmludCBlcnJvclwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IucHJldHR5UHJpbnQoKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIFwiXHUwMDFiWzQxbXVuZGVmaW5lZDoxOToxMVx1MDAxYls0OW1cbiAgICAgIHRlc3QgZXJyb3IgbXNnIGJ5IHBhdGggXHUwMDFiWzk0bSMvcGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcdTAwMWJbMzltXG5cbiAgICAgIFx1MDAxYls5MG1bMTVdOiBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE2XTogICAgICAgcGFyYW1ldGVyczpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE3XTogICAgICAgICAtIG5hbWU6IHVzZXJJZFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMThdOiAgICAgICAgICAgaW46IHBhdGhcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE5XTogICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZDogdHJ1ZVx1MDAxYlszOW1cdTAwMWJbMjRtXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMF06ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMV06ICAgICAgICAgICBzY2hlbWE6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMl06ICBcdTAwMWJbMzltXG4gICAgICBcIlxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwicHJldHR5IHByaW50IGVycm9yIHdpdGhvdXQgY29kZWZyYW1lXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY3R4LmVuYWJsZUNvZGVmcmFtZSA9IGZhbHNlO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IucHJldHR5UHJpbnQoKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIFwiXHUwMDFiWzQxbXVuZGVmaW5lZDoxOToxMVx1MDAxYls0OW1cbiAgICAgIHRlc3QgZXJyb3IgbXNnIGJ5IHBhdGggXHUwMDFiWzk0bSMvcGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcdTAwMWJbMzltXG4gICAgICBcIlxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwiY3JlYXRlIGVycm9yIHdpdGggcGF0aCBzdGFja1wiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGN0eC5wYXRoU3RhY2sgPSBbXG4gICAgICBbXCJwYXRoc1wiLCBcIi91c2VyL3t1c2VySWR9L3tuYW1lfVwiLCBcInBvc3RcIiwgXCJwYXJhbWV0ZXJzXCIsIDAsIFwicmVxdWlyZWRcIl1cbiAgICBdO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlx1MDAxYls5MG1bMTVdOiBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE2XTogICAgICAgcGFyYW1ldGVyczpcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE3XTogICAgICAgICAtIG5hbWU6IHVzZXJJZFx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMThdOiAgICAgICAgICAgaW46IHBhdGhcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE5XTogICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZDogdHJ1ZVx1MDAxYlszOW1cdTAwMWJbMjRtXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMF06ICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMV06ICAgICAgICAgICBzY2hlbWE6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsyMl06ICBcdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAyNSxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDM0MyxcbiAgICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxMSxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMzI5LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJ0ZXN0IGVycm9yIG1zZ1wiLFxuICAgICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXG4gICAgICAgICAgXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vcG9zdC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcIixcbiAgICAgICAgXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwicmVxdWlyZWRcIjogMTIzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwicHJldHR5IHByaW50IGVycm9yIHdpdGggcGF0aCBzdGFja1wiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGN0eC5wYXRoU3RhY2sgPSBbXG4gICAgICBbXCJwYXRoc1wiLCBcIi91c2VyL3t1c2VySWR9L3tuYW1lfVwiLCBcInBvc3RcIiwgXCJwYXJhbWV0ZXJzXCIsIDAsIFwicmVxdWlyZWRcIl1cbiAgICBdO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IucHJldHR5UHJpbnQoKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIFwiXHUwMDFiWzQxbXVuZGVmaW5lZDoxOToxMVx1MDAxYls0OW1cbiAgICAgIHRlc3QgZXJyb3IgbXNnIGJ5IHBhdGggXHUwMDFiWzk0bSMvcGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcdTAwMWJbMzltXG5cbiAgICAgIEVycm9yIHJlZmVyZW5jZWQgZnJvbTpcdTAwMWJbOTRtXG4gICAgICAtICMvcGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L3Bvc3QvcGFyYW1ldGVycy8wL3JlcXVpcmVkXG4gICAgICBcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE1XTogXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxNl06ICAgICAgIHBhcmFtZXRlcnM6XHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxN106ICAgICAgICAgLSBuYW1lOiB1c2VySWRcdTAwMWJbMzltXG4gICAgICBcdTAwMWJbOTBtWzE4XTogICAgICAgICAgIGluOiBwYXRoXHUwMDFiWzM5bVxuICAgICAgXHUwMDFiWzkwbVsxOV06ICAgICAgICAgICBcdTAwMWJbNG1cdTAwMWJbMzFtcmVxdWlyZWQ6IHRydWVcdTAwMWJbMzltXHUwMDFiWzI0bVx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMjBdOiAgICAgICAgICAgZGVzY3JpcHRpb246IElkIG9mIGEgdXNlclx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMjFdOiAgICAgICAgICAgc2NoZW1hOlx1MDAxYlszOW1cbiAgICAgIFx1MDAxYls5MG1bMjJdOiAgXHUwMDFiWzM5bVxuICAgICAgXCJcbiAgICBgKTtcbiAgfSk7XG59KTtcbiJdfQ==
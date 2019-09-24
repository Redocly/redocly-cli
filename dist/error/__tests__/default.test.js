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
        "codeFrame": "
            parameters:
              - name: userId
                in: path
                [4m[31mrequired: true[39m[24m
                description: Id of a user
                schema:
       ",
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
      "19:11 Following error occured:
      test error msg by path paths//user/{userId}/{name}/get/parameters/0/required


            parameters:
              - name: userId
                in: path
                [4m[31mrequired: true[39m[24m
                description: Id of a user
                schema:
       
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
      "19:11 Following error occured:
      test error msg by path paths//user/{userId}/{name}/get/parameters/0/required
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
        "codeFrame": "
            parameters:
              - name: userId
                in: path
                [4m[31mrequired: true[39m[24m
                description: Id of a user
                schema:
       ",
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
      "19:11 Following error occured:
      test error msg by path paths//user/{userId}/{name}/get/parameters/0/required

      Error traced by following path:
      paths//user/{userId}/{name}/post/parameters/0/required


            parameters:
              - name: userId
                in: path
                [4m[31mrequired: true[39m[24m
                description: Id of a user
                schema:
       
      "
    `);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9lcnJvci9fX3Rlc3RzX18vZGVmYXVsdC50ZXN0LmpzIl0sIm5hbWVzIjpbImdldFNvdXJjZSIsImZzIiwicmVhZEZpbGVTeW5jIiwiY3JlYXRlQ29udGV4dCIsImRvY3VtZW50IiwieWFtbCIsInNhZmVMb2FkIiwicGF0aCIsInBhdGhTdGFjayIsInNvdXJjZSIsImVuYWJsZUNvZGVmcmFtZSIsImRlc2NyaWJlIiwidGVzdCIsImN0eCIsIm5vZGUiLCJyZXF1aXJlZCIsImVycm9yIiwiZXhwZWN0IiwidG9NYXRjaElubGluZVNuYXBzaG90IiwicHJldHR5UHJpbnQiXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBQ0E7O0FBQ0E7Ozs7QUFFQSxNQUFNQSxTQUFTLEdBQUcsTUFDaEJDLFlBQUdDLFlBQUgsQ0FBZ0Isa0NBQWhCLEVBQW9ELE9BQXBELENBREY7O0FBR0EsTUFBTUMsYUFBYSxHQUFHLE9BQU87QUFDM0JDLEVBQUFBLFFBQVEsRUFBRUMsZ0JBQUtDLFFBQUwsQ0FBY04sU0FBUyxFQUF2QixDQURpQjtBQUUzQk8sRUFBQUEsSUFBSSxFQUFFLENBQUMsT0FBRCxFQUFVLHVCQUFWLEVBQW1DLEtBQW5DLEVBQTBDLFlBQTFDLEVBQXdELENBQXhELEVBQTJELFVBQTNELENBRnFCO0FBRzNCQyxFQUFBQSxTQUFTLEVBQUUsRUFIZ0I7QUFJM0JDLEVBQUFBLE1BQU0sRUFBRVQsU0FBUyxFQUpVO0FBSzNCVSxFQUFBQSxlQUFlLEVBQUU7QUFMVSxDQUFQLENBQXRCOztBQVFBQyxRQUFRLENBQUMsYUFBRCxFQUFnQixNQUFNO0FBQzVCQyxFQUFBQSxJQUFJLENBQUMsRUFBRCxFQUFLLE1BQU07QUFDYixVQUFNQyxHQUFHLEdBQUdWLGFBQWEsRUFBekI7QUFDQSxVQUFNVyxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyxzQkFBWSxnQkFBWixFQUE4QkYsSUFBOUIsRUFBb0NELEdBQXBDLENBQWQ7QUFDQUksSUFBQUEsTUFBTSxDQUFDRCxLQUFELENBQU4sQ0FBY0UscUJBQWQsQ0FBcUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7S0FBckM7QUE2QkQsR0FqQ0csQ0FBSjtBQW1DQU4sRUFBQUEsSUFBSSxDQUFDLGdDQUFELEVBQW1DLE1BQU07QUFDM0MsVUFBTUMsR0FBRyxHQUFHVixhQUFhLEVBQXpCO0FBQ0FVLElBQUFBLEdBQUcsQ0FBQ0gsZUFBSixHQUFzQixLQUF0QjtBQUNBLFVBQU1JLElBQUksR0FBRztBQUFFQyxNQUFBQSxRQUFRLEVBQUU7QUFBWixLQUFiO0FBQ0EsVUFBTUMsS0FBSyxHQUFHLHNCQUFZLGdCQUFaLEVBQThCRixJQUE5QixFQUFvQ0QsR0FBcEMsQ0FBZDtBQUNBSSxJQUFBQSxNQUFNLENBQUNELEtBQUQsQ0FBTixDQUFjRSxxQkFBZCxDQUFxQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0tBQXJDO0FBc0JELEdBM0JHLENBQUo7QUE2QkFOLEVBQUFBLElBQUksQ0FBQyxvQkFBRCxFQUF1QixNQUFNO0FBQy9CLFVBQU1DLEdBQUcsR0FBR1YsYUFBYSxFQUF6QjtBQUNBLFVBQU1XLElBQUksR0FBRztBQUFFQyxNQUFBQSxRQUFRLEVBQUU7QUFBWixLQUFiO0FBQ0EsVUFBTUMsS0FBSyxHQUFHLHNCQUFZLGdCQUFaLEVBQThCRixJQUE5QixFQUFvQ0QsR0FBcEMsQ0FBZDtBQUNBSSxJQUFBQSxNQUFNLENBQUNELEtBQUssQ0FBQ0csV0FBTixFQUFELENBQU4sQ0FBNEJELHFCQUE1QixDQUFtRDs7Ozs7Ozs7Ozs7OztLQUFuRDtBQWNELEdBbEJHLENBQUo7QUFvQkFOLEVBQUFBLElBQUksQ0FBQyxzQ0FBRCxFQUF5QyxNQUFNO0FBQ2pELFVBQU1DLEdBQUcsR0FBR1YsYUFBYSxFQUF6QjtBQUNBVSxJQUFBQSxHQUFHLENBQUNILGVBQUosR0FBc0IsS0FBdEI7QUFDQSxVQUFNSSxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyxzQkFBWSxnQkFBWixFQUE4QkYsSUFBOUIsRUFBb0NELEdBQXBDLENBQWQ7QUFDQUksSUFBQUEsTUFBTSxDQUFDRCxLQUFLLENBQUNHLFdBQU4sRUFBRCxDQUFOLENBQTRCRCxxQkFBNUIsQ0FBbUQ7Ozs7S0FBbkQ7QUFLRCxHQVZHLENBQUo7QUFZQU4sRUFBQUEsSUFBSSxDQUFDLDhCQUFELEVBQWlDLE1BQU07QUFDekMsVUFBTUMsR0FBRyxHQUFHVixhQUFhLEVBQXpCO0FBQ0FVLElBQUFBLEdBQUcsQ0FBQ0wsU0FBSixHQUFnQixDQUNkLENBQUMsT0FBRCxFQUFVLHVCQUFWLEVBQW1DLE1BQW5DLEVBQTJDLFlBQTNDLEVBQXlELENBQXpELEVBQTRELFVBQTVELENBRGMsQ0FBaEI7QUFHQSxVQUFNTSxJQUFJLEdBQUc7QUFBRUMsTUFBQUEsUUFBUSxFQUFFO0FBQVosS0FBYjtBQUNBLFVBQU1DLEtBQUssR0FBRyxzQkFBWSxnQkFBWixFQUE4QkYsSUFBOUIsRUFBb0NELEdBQXBDLENBQWQ7QUFDQUksSUFBQUEsTUFBTSxDQUFDRCxLQUFELENBQU4sQ0FBY0UscUJBQWQsQ0FBcUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztLQUFyQztBQStCRCxHQXRDRyxDQUFKO0FBd0NBTixFQUFBQSxJQUFJLENBQUMsb0NBQUQsRUFBdUMsTUFBTTtBQUMvQyxVQUFNQyxHQUFHLEdBQUdWLGFBQWEsRUFBekI7QUFDQVUsSUFBQUEsR0FBRyxDQUFDTCxTQUFKLEdBQWdCLENBQ2QsQ0FBQyxPQUFELEVBQVUsdUJBQVYsRUFBbUMsTUFBbkMsRUFBMkMsWUFBM0MsRUFBeUQsQ0FBekQsRUFBNEQsVUFBNUQsQ0FEYyxDQUFoQjtBQUdBLFVBQU1NLElBQUksR0FBRztBQUFFQyxNQUFBQSxRQUFRLEVBQUU7QUFBWixLQUFiO0FBQ0EsVUFBTUMsS0FBSyxHQUFHLHNCQUFZLGdCQUFaLEVBQThCRixJQUE5QixFQUFvQ0QsR0FBcEMsQ0FBZDtBQUNBSSxJQUFBQSxNQUFNLENBQUNELEtBQUssQ0FBQ0csV0FBTixFQUFELENBQU4sQ0FBNEJELHFCQUE1QixDQUFtRDs7Ozs7Ozs7Ozs7Ozs7OztLQUFuRDtBQWlCRCxHQXhCRyxDQUFKO0FBeUJELENBbEtPLENBQVIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgeWFtbCBmcm9tIFwianMteWFtbFwiO1xuaW1wb3J0IGNyZWF0ZUVycm9yIGZyb20gXCIuLi9kZWZhdWx0XCI7XG5cbmNvbnN0IGdldFNvdXJjZSA9ICgpID0+XG4gIGZzLnJlYWRGaWxlU3luYyhcIi4vdGVzdC9zcGVjcy9vcGVuYXBpL3Rlc3QtMS55YW1sXCIsIFwidXRmLThcIik7XG5cbmNvbnN0IGNyZWF0ZUNvbnRleHQgPSAoKSA9PiAoe1xuICBkb2N1bWVudDogeWFtbC5zYWZlTG9hZChnZXRTb3VyY2UoKSksXG4gIHBhdGg6IFtcInBhdGhzXCIsIFwiL3VzZXIve3VzZXJJZH0ve25hbWV9XCIsIFwiZ2V0XCIsIFwicGFyYW1ldGVyc1wiLCAwLCBcInJlcXVpcmVkXCJdLFxuICBwYXRoU3RhY2s6IFtdLFxuICBzb3VyY2U6IGdldFNvdXJjZSgpLFxuICBlbmFibGVDb2RlZnJhbWU6IHRydWVcbn0pO1xuXG5kZXNjcmliZShcImNyZWF0ZUVycm9yXCIsICgpID0+IHtcbiAgdGVzdChcIlwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBPYmplY3Qge1xuICAgICAgICBcImNvZGVGcmFtZVwiOiBcIlxuICAgICAgICAgICAgcGFyYW1ldGVyczpcbiAgICAgICAgICAgICAgLSBuYW1lOiB1c2VySWRcbiAgICAgICAgICAgICAgICBpbjogcGF0aFxuICAgICAgICAgICAgICAgIFx1MDAxYls0bVx1MDAxYlszMW1yZXF1aXJlZDogdHJ1ZVx1MDAxYlszOW1cdTAwMWJbMjRtXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IElkIG9mIGEgdXNlclxuICAgICAgICAgICAgICAgIHNjaGVtYTpcbiAgICAgICBcIixcbiAgICAgICAgXCJmaWxlXCI6IHVuZGVmaW5lZCxcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDI1LFxuICAgICAgICAgIFwiZW5kSW5kZXhcIjogMzQzLFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxOSxcbiAgICAgICAgICBcInN0YXJ0Q29sXCI6IDExLFxuICAgICAgICAgIFwic3RhcnRJbmRleFwiOiAzMjksXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMTksXG4gICAgICAgIH0sXG4gICAgICAgIFwibWVzc2FnZVwiOiBcInRlc3QgZXJyb3IgbXNnXCIsXG4gICAgICAgIFwicGF0aFwiOiBcInBhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9nZXQvcGFyYW1ldGVycy8wL3JlcXVpcmVkXCIsXG4gICAgICAgIFwicGF0aFN0YWNrXCI6IEFycmF5IFtdLFxuICAgICAgICBcInByZXR0eVByaW50XCI6IFtGdW5jdGlvbl0sXG4gICAgICAgIFwic2V2ZXJpdHlcIjogXCJFUlJPUlwiLFxuICAgICAgICBcInZhbHVlXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJyZXF1aXJlZFwiOiAxMjMsXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgYCk7XG4gIH0pO1xuXG4gIHRlc3QoXCJjcmVhdGUgZXJyb3Igd2l0aCBubyBjb2RlZnJhbWVcIiwgKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgICBjdHguZW5hYmxlQ29kZWZyYW1lID0gZmFsc2U7XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoXCJ0ZXN0IGVycm9yIG1zZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvcikudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IG51bGwsXG4gICAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAyNSxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDM0MyxcbiAgICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxMSxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMzI5LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJ0ZXN0IGVycm9yIG1zZ1wiLFxuICAgICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwicmVxdWlyZWRcIjogMTIzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwicHJldHR5IHByaW50IGVycm9yXCIsICgpID0+IHtcbiAgICBjb25zdCBjdHggPSBjcmVhdGVDb250ZXh0KCk7XG4gICAgY29uc3Qgbm9kZSA9IHsgcmVxdWlyZWQ6IDEyMyB9O1xuICAgIGNvbnN0IGVycm9yID0gY3JlYXRlRXJyb3IoXCJ0ZXN0IGVycm9yIG1zZ1wiLCBub2RlLCBjdHgpO1xuICAgIGV4cGVjdChlcnJvci5wcmV0dHlQcmludCgpKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgICAgXCIxOToxMSBGb2xsb3dpbmcgZXJyb3Igb2NjdXJlZDpcbiAgICAgIHRlc3QgZXJyb3IgbXNnIGJ5IHBhdGggcGF0aHMvL3VzZXIve3VzZXJJZH0ve25hbWV9L2dldC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcblxuXG4gICAgICAgICAgICBwYXJhbWV0ZXJzOlxuICAgICAgICAgICAgICAtIG5hbWU6IHVzZXJJZFxuICAgICAgICAgICAgICAgIGluOiBwYXRoXG4gICAgICAgICAgICAgICAgXHUwMDFiWzRtXHUwMDFiWzMxbXJlcXVpcmVkOiB0cnVlXHUwMDFiWzM5bVx1MDAxYlsyNG1cbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogSWQgb2YgYSB1c2VyXG4gICAgICAgICAgICAgICAgc2NoZW1hOlxuICAgICAgIFxuICAgICAgXCJcbiAgICBgKTtcbiAgfSk7XG5cbiAgdGVzdChcInByZXR0eSBwcmludCBlcnJvciB3aXRob3V0IGNvZGVmcmFtZVwiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGN0eC5lbmFibGVDb2RlZnJhbWUgPSBmYWxzZTtcbiAgICBjb25zdCBub2RlID0geyByZXF1aXJlZDogMTIzIH07XG4gICAgY29uc3QgZXJyb3IgPSBjcmVhdGVFcnJvcihcInRlc3QgZXJyb3IgbXNnXCIsIG5vZGUsIGN0eCk7XG4gICAgZXhwZWN0KGVycm9yLnByZXR0eVByaW50KCkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXG4gICAgICBcIjE5OjExIEZvbGxvd2luZyBlcnJvciBvY2N1cmVkOlxuICAgICAgdGVzdCBlcnJvciBtc2cgYnkgcGF0aCBwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFxuICAgICAgXCJcbiAgICBgKTtcbiAgfSk7XG5cbiAgdGVzdChcImNyZWF0ZSBlcnJvciB3aXRoIHBhdGggc3RhY2tcIiwgKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGNyZWF0ZUNvbnRleHQoKTtcbiAgICBjdHgucGF0aFN0YWNrID0gW1xuICAgICAgW1wicGF0aHNcIiwgXCIvdXNlci97dXNlcklkfS97bmFtZX1cIiwgXCJwb3N0XCIsIFwicGFyYW1ldGVyc1wiLCAwLCBcInJlcXVpcmVkXCJdXG4gICAgXTtcbiAgICBjb25zdCBub2RlID0geyByZXF1aXJlZDogMTIzIH07XG4gICAgY29uc3QgZXJyb3IgPSBjcmVhdGVFcnJvcihcInRlc3QgZXJyb3IgbXNnXCIsIG5vZGUsIGN0eCk7XG4gICAgZXhwZWN0KGVycm9yKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgICAgT2JqZWN0IHtcbiAgICAgICAgXCJjb2RlRnJhbWVcIjogXCJcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6XG4gICAgICAgICAgICAgIC0gbmFtZTogdXNlcklkXG4gICAgICAgICAgICAgICAgaW46IHBhdGhcbiAgICAgICAgICAgICAgICBcdTAwMWJbNG1cdTAwMWJbMzFtcmVxdWlyZWQ6IHRydWVcdTAwMWJbMzltXHUwMDFiWzI0bVxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBJZCBvZiBhIHVzZXJcbiAgICAgICAgICAgICAgICBzY2hlbWE6XG4gICAgICAgXCIsXG4gICAgICAgIFwiZmlsZVwiOiB1bmRlZmluZWQsXG4gICAgICAgIFwibG9jYXRpb25cIjogT2JqZWN0IHtcbiAgICAgICAgICBcImVuZENvbFwiOiAyNSxcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDM0MyxcbiAgICAgICAgICBcImVuZExpbmVcIjogMTksXG4gICAgICAgICAgXCJzdGFydENvbFwiOiAxMSxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMzI5LFxuICAgICAgICAgIFwic3RhcnRMaW5lXCI6IDE5LFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJ0ZXN0IGVycm9yIG1zZ1wiLFxuICAgICAgICBcInBhdGhcIjogXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vZ2V0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXG4gICAgICAgICAgXCJwYXRocy8vdXNlci97dXNlcklkfS97bmFtZX0vcG9zdC9wYXJhbWV0ZXJzLzAvcmVxdWlyZWRcIixcbiAgICAgICAgXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwicmVxdWlyZWRcIjogMTIzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIGApO1xuICB9KTtcblxuICB0ZXN0KFwicHJldHR5IHByaW50IGVycm9yIHdpdGggcGF0aCBzdGFja1wiLCAoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gY3JlYXRlQ29udGV4dCgpO1xuICAgIGN0eC5wYXRoU3RhY2sgPSBbXG4gICAgICBbXCJwYXRoc1wiLCBcIi91c2VyL3t1c2VySWR9L3tuYW1lfVwiLCBcInBvc3RcIiwgXCJwYXJhbWV0ZXJzXCIsIDAsIFwicmVxdWlyZWRcIl1cbiAgICBdO1xuICAgIGNvbnN0IG5vZGUgPSB7IHJlcXVpcmVkOiAxMjMgfTtcbiAgICBjb25zdCBlcnJvciA9IGNyZWF0ZUVycm9yKFwidGVzdCBlcnJvciBtc2dcIiwgbm9kZSwgY3R4KTtcbiAgICBleHBlY3QoZXJyb3IucHJldHR5UHJpbnQoKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcbiAgICAgIFwiMTk6MTEgRm9sbG93aW5nIGVycm9yIG9jY3VyZWQ6XG4gICAgICB0ZXN0IGVycm9yIG1zZyBieSBwYXRoIHBhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9nZXQvcGFyYW1ldGVycy8wL3JlcXVpcmVkXG5cbiAgICAgIEVycm9yIHRyYWNlZCBieSBmb2xsb3dpbmcgcGF0aDpcbiAgICAgIHBhdGhzLy91c2VyL3t1c2VySWR9L3tuYW1lfS9wb3N0L3BhcmFtZXRlcnMvMC9yZXF1aXJlZFxuXG5cbiAgICAgICAgICAgIHBhcmFtZXRlcnM6XG4gICAgICAgICAgICAgIC0gbmFtZTogdXNlcklkXG4gICAgICAgICAgICAgICAgaW46IHBhdGhcbiAgICAgICAgICAgICAgICBcdTAwMWJbNG1cdTAwMWJbMzFtcmVxdWlyZWQ6IHRydWVcdTAwMWJbMzltXHUwMDFiWzI0bVxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBJZCBvZiBhIHVzZXJcbiAgICAgICAgICAgICAgICBzY2hlbWE6XG4gICAgICAgXG4gICAgICBcIlxuICAgIGApO1xuICB9KTtcbn0pO1xuIl19
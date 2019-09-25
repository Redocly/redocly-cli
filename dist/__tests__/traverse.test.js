"use strict";

var _fs = _interopRequireDefault(require("fs"));

var _traverse = _interopRequireDefault(require("../traverse"));

var _error = require("../error");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getSource = () => _fs.default.readFileSync("./test/specs/openapi/test-3.yaml", "utf-8");

test("Traverse over a flat node with empty resolver", () => {
  const node = {
    name: "test node",
    value: 12
  };
  const resolver = {};
  expect((0, _traverse.default)(node, resolver)).toMatchInlineSnapshot("Array []");
});
test("", () => {
  const node = {
    field: 12,
    b: 12,
    "x-allowed": true,
    child: {
      a: "text"
    }
  };
  const resolver = {
    validators: {
      field() {
        return (targetNode, ctx) => typeof node.field === "string" ? null : (0, _error.createErrrorFieldTypeMismatch)("string", targetNode, ctx);
      }

    },
    properties: {
      child: {
        validators: {
          a() {
            return () => null;
          }

        }
      }
    }
  };
  expect((0, _traverse.default)(node, resolver, getSource())).toMatchInlineSnapshot(`
    Array [
      Object {
        "codeFrame": "[90m[1]: field: 12[39m
    [90m[2]: [4m[31mb[39m[24m:  12[39m
    [90m[3]: x-allowed: true[39m
    [90m[4]: child:[39m
    [90m[5]:  [39m",
        "file": "",
        "location": Object {
          "endCol": 2,
          "endIndex": 11,
          "endLine": 2,
          "startCol": 1,
          "startIndex": 10,
          "startLine": 2,
        },
        "message": "b is not allowed here. Use \\"x-\\" prefix to override this behavior",
        "path": "b",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "b": 12,
          "child": Object {
            "a": "text",
          },
          "field": 12,
          "x-allowed": true,
        },
      },
      Object {
        "codeFrame": "[90m[1]: [4m[31mfield[39m[24m: 12[39m
    [90m[2]: b:  12[39m
    [90m[3]: x-allowed: true[39m
    [90m[4]: c[39m",
        "file": "",
        "location": Object {
          "endCol": 0,
          "endIndex": 5,
          "endLine": 1,
          "startCol": 0,
          "startIndex": 0,
          "startLine": 1,
        },
        "message": "This field must be of string type",
        "path": "field",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "b": 12,
          "child": Object {
            "a": "text",
          },
          "field": 12,
          "x-allowed": true,
        },
      },
    ]
  `);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9fX3Rlc3RzX18vdHJhdmVyc2UudGVzdC5qcyJdLCJuYW1lcyI6WyJnZXRTb3VyY2UiLCJmcyIsInJlYWRGaWxlU3luYyIsInRlc3QiLCJub2RlIiwibmFtZSIsInZhbHVlIiwicmVzb2x2ZXIiLCJleHBlY3QiLCJ0b01hdGNoSW5saW5lU25hcHNob3QiLCJmaWVsZCIsImIiLCJjaGlsZCIsImEiLCJ2YWxpZGF0b3JzIiwidGFyZ2V0Tm9kZSIsImN0eCIsInByb3BlcnRpZXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBRUE7O0FBQ0E7Ozs7QUFFQSxNQUFNQSxTQUFTLEdBQUcsTUFDaEJDLFlBQUdDLFlBQUgsQ0FBZ0Isa0NBQWhCLEVBQW9ELE9BQXBELENBREY7O0FBR0FDLElBQUksQ0FBQywrQ0FBRCxFQUFrRCxNQUFNO0FBQzFELFFBQU1DLElBQUksR0FBRztBQUNYQyxJQUFBQSxJQUFJLEVBQUUsV0FESztBQUVYQyxJQUFBQSxLQUFLLEVBQUU7QUFGSSxHQUFiO0FBSUEsUUFBTUMsUUFBUSxHQUFHLEVBQWpCO0FBQ0FDLEVBQUFBLE1BQU0sQ0FBQyx1QkFBU0osSUFBVCxFQUFlRyxRQUFmLENBQUQsQ0FBTixDQUFpQ0UscUJBQWpDLENBQXVELFVBQXZEO0FBQ0QsQ0FQRyxDQUFKO0FBU0FOLElBQUksQ0FBQyxFQUFELEVBQUssTUFBTTtBQUNiLFFBQU1DLElBQUksR0FBRztBQUNYTSxJQUFBQSxLQUFLLEVBQUUsRUFESTtBQUVYQyxJQUFBQSxDQUFDLEVBQUUsRUFGUTtBQUdYLGlCQUFhLElBSEY7QUFJWEMsSUFBQUEsS0FBSyxFQUFFO0FBQ0xDLE1BQUFBLENBQUMsRUFBRTtBQURFO0FBSkksR0FBYjtBQVFBLFFBQU1OLFFBQVEsR0FBRztBQUNmTyxJQUFBQSxVQUFVLEVBQUU7QUFDVkosTUFBQUEsS0FBSyxHQUFHO0FBQ04sZUFBTyxDQUFDSyxVQUFELEVBQWFDLEdBQWIsS0FDTCxPQUFPWixJQUFJLENBQUNNLEtBQVosS0FBc0IsUUFBdEIsR0FDSSxJQURKLEdBRUksMENBQThCLFFBQTlCLEVBQXdDSyxVQUF4QyxFQUFvREMsR0FBcEQsQ0FITjtBQUlEOztBQU5TLEtBREc7QUFTZkMsSUFBQUEsVUFBVSxFQUFFO0FBQ1ZMLE1BQUFBLEtBQUssRUFBRTtBQUNMRSxRQUFBQSxVQUFVLEVBQUU7QUFDVkQsVUFBQUEsQ0FBQyxHQUFHO0FBQ0YsbUJBQU8sTUFBTSxJQUFiO0FBQ0Q7O0FBSFM7QUFEUDtBQURHO0FBVEcsR0FBakI7QUFtQkFMLEVBQUFBLE1BQU0sQ0FBQyx1QkFBU0osSUFBVCxFQUFlRyxRQUFmLEVBQXlCUCxTQUFTLEVBQWxDLENBQUQsQ0FBTixDQUE4Q1MscUJBQTlDLENBQXFFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FBckU7QUE2REQsQ0F6RkcsQ0FBSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyBmcm9tIFwiZnNcIjtcblxuaW1wb3J0IHRyYXZlcnNlIGZyb20gXCIuLi90cmF2ZXJzZVwiO1xuaW1wb3J0IHsgY3JlYXRlRXJycm9yRmllbGRUeXBlTWlzbWF0Y2ggfSBmcm9tIFwiLi4vZXJyb3JcIjtcblxuY29uc3QgZ2V0U291cmNlID0gKCkgPT5cbiAgZnMucmVhZEZpbGVTeW5jKFwiLi90ZXN0L3NwZWNzL29wZW5hcGkvdGVzdC0zLnlhbWxcIiwgXCJ1dGYtOFwiKTtcblxudGVzdChcIlRyYXZlcnNlIG92ZXIgYSBmbGF0IG5vZGUgd2l0aCBlbXB0eSByZXNvbHZlclwiLCAoKSA9PiB7XG4gIGNvbnN0IG5vZGUgPSB7XG4gICAgbmFtZTogXCJ0ZXN0IG5vZGVcIixcbiAgICB2YWx1ZTogMTJcbiAgfTtcbiAgY29uc3QgcmVzb2x2ZXIgPSB7fTtcbiAgZXhwZWN0KHRyYXZlcnNlKG5vZGUsIHJlc29sdmVyKSkudG9NYXRjaElubGluZVNuYXBzaG90KFwiQXJyYXkgW11cIik7XG59KTtcblxudGVzdChcIlwiLCAoKSA9PiB7XG4gIGNvbnN0IG5vZGUgPSB7XG4gICAgZmllbGQ6IDEyLFxuICAgIGI6IDEyLFxuICAgIFwieC1hbGxvd2VkXCI6IHRydWUsXG4gICAgY2hpbGQ6IHtcbiAgICAgIGE6IFwidGV4dFwiXG4gICAgfVxuICB9O1xuICBjb25zdCByZXNvbHZlciA9IHtcbiAgICB2YWxpZGF0b3JzOiB7XG4gICAgICBmaWVsZCgpIHtcbiAgICAgICAgcmV0dXJuICh0YXJnZXROb2RlLCBjdHgpID0+XG4gICAgICAgICAgdHlwZW9mIG5vZGUuZmllbGQgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgOiBjcmVhdGVFcnJyb3JGaWVsZFR5cGVNaXNtYXRjaChcInN0cmluZ1wiLCB0YXJnZXROb2RlLCBjdHgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgcHJvcGVydGllczoge1xuICAgICAgY2hpbGQ6IHtcbiAgICAgICAgdmFsaWRhdG9yczoge1xuICAgICAgICAgIGEoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCkgPT4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG4gIGV4cGVjdCh0cmF2ZXJzZShub2RlLCByZXNvbHZlciwgZ2V0U291cmNlKCkpKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxuICAgIEFycmF5IFtcbiAgICAgIE9iamVjdCB7XG4gICAgICAgIFwiY29kZUZyYW1lXCI6IFwiXHUwMDFiWzkwbVsxXTogZmllbGQ6IDEyXHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bMl06IFx1MDAxYls0bVx1MDAxYlszMW1iXHUwMDFiWzM5bVx1MDAxYlsyNG06ICAxMlx1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtWzNdOiB4LWFsbG93ZWQ6IHRydWVcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVs0XTogY2hpbGQ6XHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bNV06ICBcdTAwMWJbMzltXCIsXG4gICAgICAgIFwiZmlsZVwiOiBcIlwiLFxuICAgICAgICBcImxvY2F0aW9uXCI6IE9iamVjdCB7XG4gICAgICAgICAgXCJlbmRDb2xcIjogMixcbiAgICAgICAgICBcImVuZEluZGV4XCI6IDExLFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAyLFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogMSxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMTAsXG4gICAgICAgICAgXCJzdGFydExpbmVcIjogMixcbiAgICAgICAgfSxcbiAgICAgICAgXCJtZXNzYWdlXCI6IFwiYiBpcyBub3QgYWxsb3dlZCBoZXJlLiBVc2UgXFxcXFwieC1cXFxcXCIgcHJlZml4IHRvIG92ZXJyaWRlIHRoaXMgYmVoYXZpb3JcIixcbiAgICAgICAgXCJwYXRoXCI6IFwiYlwiLFxuICAgICAgICBcInBhdGhTdGFja1wiOiBBcnJheSBbXSxcbiAgICAgICAgXCJwcmV0dHlQcmludFwiOiBbRnVuY3Rpb25dLFxuICAgICAgICBcInNldmVyaXR5XCI6IFwiRVJST1JcIixcbiAgICAgICAgXCJ2YWx1ZVwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiYlwiOiAxMixcbiAgICAgICAgICBcImNoaWxkXCI6IE9iamVjdCB7XG4gICAgICAgICAgICBcImFcIjogXCJ0ZXh0XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImZpZWxkXCI6IDEyLFxuICAgICAgICAgIFwieC1hbGxvd2VkXCI6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgT2JqZWN0IHtcbiAgICAgICAgXCJjb2RlRnJhbWVcIjogXCJcdTAwMWJbOTBtWzFdOiBcdTAwMWJbNG1cdTAwMWJbMzFtZmllbGRcdTAwMWJbMzltXHUwMDFiWzI0bTogMTJcdTAwMWJbMzltXG4gICAgXHUwMDFiWzkwbVsyXTogYjogIDEyXHUwMDFiWzM5bVxuICAgIFx1MDAxYls5MG1bM106IHgtYWxsb3dlZDogdHJ1ZVx1MDAxYlszOW1cbiAgICBcdTAwMWJbOTBtWzRdOiBjXHUwMDFiWzM5bVwiLFxuICAgICAgICBcImZpbGVcIjogXCJcIixcbiAgICAgICAgXCJsb2NhdGlvblwiOiBPYmplY3Qge1xuICAgICAgICAgIFwiZW5kQ29sXCI6IDAsXG4gICAgICAgICAgXCJlbmRJbmRleFwiOiA1LFxuICAgICAgICAgIFwiZW5kTGluZVwiOiAxLFxuICAgICAgICAgIFwic3RhcnRDb2xcIjogMCxcbiAgICAgICAgICBcInN0YXJ0SW5kZXhcIjogMCxcbiAgICAgICAgICBcInN0YXJ0TGluZVwiOiAxLFxuICAgICAgICB9LFxuICAgICAgICBcIm1lc3NhZ2VcIjogXCJUaGlzIGZpZWxkIG11c3QgYmUgb2Ygc3RyaW5nIHR5cGVcIixcbiAgICAgICAgXCJwYXRoXCI6IFwiZmllbGRcIixcbiAgICAgICAgXCJwYXRoU3RhY2tcIjogQXJyYXkgW10sXG4gICAgICAgIFwicHJldHR5UHJpbnRcIjogW0Z1bmN0aW9uXSxcbiAgICAgICAgXCJzZXZlcml0eVwiOiBcIkVSUk9SXCIsXG4gICAgICAgIFwidmFsdWVcIjogT2JqZWN0IHtcbiAgICAgICAgICBcImJcIjogMTIsXG4gICAgICAgICAgXCJjaGlsZFwiOiBPYmplY3Qge1xuICAgICAgICAgICAgXCJhXCI6IFwidGV4dFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJmaWVsZFwiOiAxMixcbiAgICAgICAgICBcIngtYWxsb3dlZFwiOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICBdXG4gIGApO1xufSk7XG4iXX0=
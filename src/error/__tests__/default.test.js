import fs from "fs";
import yaml from "js-yaml";
import createError from "../default";

const getSource = () =>
  fs.readFileSync("./test/specs/openapi/test-1.yaml", "utf-8");

const createContext = () => ({
  document: yaml.safeLoad(getSource()),
  path: ["paths", "/user/{userId}/{name}", "get", "parameters", 0, "required"],
  pathStack: [],
  source: getSource(),
  enableCodeframe: true
});

describe("createError", () => {
  test("", () => {
    const ctx = createContext();
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m16| parameters:[39m
      [90m17|   - name: userId[39m
      [90m18|     in: path[39m
      [90m19|     [4m[31mrequired: true[39m[24m[39m
      [90m20|     description: Id of a user[39m
      [90m21|     schema:[39m
      [90m22|       type: integer[39m",
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
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
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
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m [90mat #/[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m[39m

      test error msg

      [90m16| parameters:[39m
      [90m17|   - name: userId[39m
      [90m18|     in: path[39m
      [90m19|     [4m[31mrequired: true[39m[24m[39m
      [90m20|     description: Id of a user[39m
      [90m21|     schema:[39m
      [90m22|       type: integer[39m


      "
    `);
  });

  test("pretty print error without codeframe", () => {
    const ctx = createContext();
    ctx.enableCodeframe = false;
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m [90mat #/[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m[39m

      test error msg


      "
    `);
  });

  test("create error with path stack", () => {
    const ctx = createContext();
    ctx.pathStack = [
      {
        path: ["paths"],
        file: "test/specs/openapi/test-1.yaml"
      }
    ];
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m16| parameters:[39m
      [90m17|   - name: userId[39m
      [90m18|     in: path[39m
      [90m19|     [4m[31mrequired: true[39m[24m[39m
      [90m20|     description: Id of a user[39m
      [90m21|     schema:[39m
      [90m22|       type: integer[39m",
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
    ctx.pathStack = [
      {
        path: [
          "paths",
          "/user/{userId}/{name}",
          "get",
          "parameters",
          0,
          "required"
        ],
        file: "test/specs/openapi/test-1.yaml"
      }
    ];
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m [90mat #/[90mpaths[39m[90m/[39m[90m['[39m[94m/user/{userId}/{name}[39m[90m'][39m[90m/[39m[90mget[39m[90m/[39m[90mparameters[39m[90m/[39m[90m0[39m[90m/[39m[90mrequired[39m[39m
        from [94mtest/specs/openapi/test-1.yaml:19[39m [90m#/paths//user/{userId}/{name}/get/parameters/0/required[39m

      test error msg

      [90m16| parameters:[39m
      [90m17|   - name: userId[39m
      [90m18|     in: path[39m
      [90m19|     [4m[31mrequired: true[39m[24m[39m
      [90m20|     description: Id of a user[39m
      [90m21|     schema:[39m
      [90m22|       type: integer[39m


      "
    `);
  });
});

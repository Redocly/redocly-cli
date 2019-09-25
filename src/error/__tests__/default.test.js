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
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
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
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
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
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "[41mundefined:19:11[49m
      test error msg by path [94m#/paths//user/{userId}/{name}/get/parameters/0/required[39m
      "
    `);
  });

  test("create error with path stack", () => {
    const ctx = createContext();
    ctx.pathStack = [
      ["paths", "/user/{userId}/{name}", "post", "parameters", 0, "required"]
    ];
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
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
    ctx.pathStack = [
      ["paths", "/user/{userId}/{name}", "post", "parameters", 0, "required"]
    ];
    const node = { required: 123 };
    const error = createError("test error msg", node, ctx);
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

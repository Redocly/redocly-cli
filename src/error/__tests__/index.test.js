import yaml from "js-yaml";
import fs from "fs";
import {
  createErrorMissingRequiredField,
  createErrorFieldNotAllowed,
  createErrrorFieldTypeMismatch,
  createErrorMutuallyExclusiveFields
} from "..";

const getSource = () =>
  fs.readFileSync("./test/specs/openapi/test-1.yaml", "utf-8");

const createContext = () => ({
  document: yaml.safeLoad(getSource()),
  path: ["paths", "/user/{userId}/{name}", "get", "parameters"],
  pathStack: [],
  source: getSource(),
  enableCodeframe: true
});

describe("createErrorFieldNotAllowed", () => {
  test("", () => {
    const ctx = createContext();
    const node = { required: 123 };
    const error = createErrorFieldNotAllowed("wrong", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m13| get:[39m
      [90m14|   summary: Get a list of all users[39m
      [90m15|   description: Also gives their status[39m
      [90m16|   [4m[31mparameters[39m[24m:[39m
      [90m17|     - name: userId[39m
      [90m18|       in: path[39m
      [90m19|       required: true[39m",
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
    const node = { required: 123 };
    const error = createErrorMissingRequiredField("name", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m13| get:[39m
      [90m14|   summary: Get a list of all users[39m
      [90m15|   description: Also gives their status[39m
      [90m16|   [4m[31mparameters[39m[24m:[39m
      [90m17|     - name: userId[39m
      [90m18|       in: path[39m
      [90m19|       required: true[39m",
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
    ctx.path = [
      "paths",
      "/user/{userId}/{name}",
      "get",
      "parameters",
      0,
      "required"
    ];
    const node = { required: 123 };
    const error = createErrrorFieldTypeMismatch("boolean", node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m16| parameters:[39m
      [90m17|   - name: userId[39m
      [90m18|     in: path[39m
      [90m19|     [4m[31mrequired[39m[24m: true[39m
      [90m20|     description: Id of a user[39m
      [90m21|     schema:[39m",
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
  ctx.path = [
    "paths",
    "/user/{userId}/{name}",
    "get",
    "parameters",
    0,
    "required"
  ];
  const node = { required: 123 };
  const error = createErrorMutuallyExclusiveFields(
    ["example", "examples"],
    node,
    ctx
  );
  expect(error).toMatchInlineSnapshot(`
    Object {
      "codeFrame": "[90m16| parameters:[39m
    [90m17|   - name: userId[39m
    [90m18|     in: path[39m
    [90m19|     [4m[31mrequired[39m[24m: true[39m
    [90m20|     description: Id of a user[39m
    [90m21|     schema:[39m",
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

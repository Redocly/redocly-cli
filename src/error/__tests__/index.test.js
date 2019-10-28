import yaml from "js-yaml";
import fs from "fs";

import {
  createErrorFieldNotAllowed,
  createErrorMissingRequiredField,
  createErrrorFieldTypeMismatch,
  createErrorMutuallyExclusiveFields
} from "../index";
import { messageLevels } from "../default";

const createCtx = () => ({
  document: yaml.safeLoad(
    fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8")
  ),
  filePath: "./definitions/syntetic/syntetic-1.yaml",
  path: [],
  cache: {},
  visited: [],
  definitionStack: [],
  pathStack: [],
  source: fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8"),
  enableCodeframe: true
});

describe("Error templates", () => {
  test("createErrorFieldNotAllowed", () => {
    const ctx = {
      ...createCtx(),
      path: ["paths", "user", "get", "responses"]
    };
    expect(
      createErrorFieldNotAllowed("200", {}, ctx, {
        severity: messageLevels.ERROR
      })
    ).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m20|       operationId: userGet[39m
      [90m21|       description: Get user[39m
      [90m22|       [4m[31mresponses[90m[24m:[39m
      [90m23|         '200':[39m
      [90m24|           description: example description[39m",
        "enableCodeframe": true,
        "file": "definitions/syntetic/syntetic-1.yaml",
        "fromRule": undefined,
        "location": Object {
          "endCol": 16,
          "endIndex": 392,
          "endLine": 22,
          "startCol": 7,
          "startIndex": 383,
          "startLine": 22,
        },
        "message": "The field '200' is not allowed here. Use \\"x-\\" prefix to override this behavior.",
        "path": Array [
          "paths",
          "user",
          "get",
          "responses",
        ],
        "pathStack": Array [],
        "possibleAlternate": undefined,
        "severity": 4,
        "target": "key",
        "value": Object {},
      }
    `);
  });
  test("createErrorMissingRequiredField", () => {
    const ctx = {
      ...createCtx(),
      path: ["paths", "user", "get"]
    };
    expect(
      createErrorMissingRequiredField("responses", {}, ctx, {
        severity: messageLevels.ERROR
      })
    ).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m17|     parameters:[39m
      [90m18|       - $ref: '#/components/parameters/example'[39m
      [90m19|     [4m[31mget[90m[24m:[39m
      [90m20|       operationId: userGet[39m
      [90m21|       description: Get user[39m",
        "enableCodeframe": true,
        "file": "definitions/syntetic/syntetic-1.yaml",
        "fromRule": undefined,
        "location": Object {
          "endCol": 8,
          "endIndex": 320,
          "endLine": 19,
          "startCol": 5,
          "startIndex": 317,
          "startLine": 19,
        },
        "message": "The field 'responses' must be present on this level.",
        "path": Array [
          "paths",
          "user",
          "get",
        ],
        "pathStack": Array [],
        "possibleAlternate": undefined,
        "severity": 4,
        "target": "key",
        "value": Object {},
      }
    `);
  });
  test("createErrrorFieldTypeMismatch", () => {
    const ctx = {
      ...createCtx(),
      path: ["paths", "user", "get", "responses"]
    };
    expect(
      createErrrorFieldTypeMismatch("object", {}, ctx, {
        severity: messageLevels.ERROR
      })
    ).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m20|       operationId: userGet[39m
      [90m21|       description: Get user[39m
      [90m22|       [4m[31mresponses[90m[24m:[39m
      [90m23|         '200':[39m
      [90m24|           description: example description[39m",
        "enableCodeframe": true,
        "file": "definitions/syntetic/syntetic-1.yaml",
        "fromRule": undefined,
        "location": Object {
          "endCol": 16,
          "endIndex": 392,
          "endLine": 22,
          "startCol": 7,
          "startIndex": 383,
          "startLine": 22,
        },
        "message": "This field must be of object type.",
        "path": Array [
          "paths",
          "user",
          "get",
          "responses",
        ],
        "pathStack": Array [],
        "possibleAlternate": undefined,
        "severity": 4,
        "target": "key",
        "value": Object {},
      }
    `);
  });
  test("createErrorMutuallyExclusiveFields", () => {
    const ctx = {
      ...createCtx(),
      path: ["paths", "user", "get", "responses"]
    };
    expect(
      createErrorMutuallyExclusiveFields(
        ["responses", "description"],
        {},
        ctx,
        {
          severity: messageLevels.ERROR
        }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "[90m20|       operationId: userGet[39m
      [90m21|       description: Get user[39m
      [90m22|       [4m[31mresponses[90m[24m:[39m
      [90m23|         '200':[39m
      [90m24|           description: example description[39m",
        "enableCodeframe": true,
        "file": "definitions/syntetic/syntetic-1.yaml",
        "fromRule": undefined,
        "location": Object {
          "endCol": 16,
          "endIndex": 392,
          "endLine": 22,
          "startCol": 7,
          "startIndex": 383,
          "startLine": 22,
        },
        "message": "Fields 'responses', 'description' are mutually exclusive.",
        "path": Array [
          "paths",
          "user",
          "get",
          "responses",
        ],
        "pathStack": Array [],
        "possibleAlternate": undefined,
        "severity": 4,
        "target": "key",
        "value": Object {},
      }
    `);
  });
});

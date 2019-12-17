import fs from "fs";
import { getLocationByPath, getCodeFrameForLocation } from "../index";

describe("getLocationByPath", () => {
  test("", () => {
    const context = {
      source: fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8")
    };

    expect(
      getLocationByPath(
        ["paths", "user", "get", "responses", "200"],
        context,
        "key"
      )
    ).toMatchInlineSnapshot(`
      Object {
        "endCol": 14,
        "endIndex": 456,
        "endLine": 25,
        "startCol": 9,
        "startIndex": 451,
        "startLine": 25,
      }
    `);
  });

  test("", () => {
    const context = {
      source: fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8")
    };

    expect(getLocationByPath([""], context, "key")).toMatchInlineSnapshot(`
      Object {
        "endCol": 14,
        "endIndex": 14,
        "endLine": 1,
        "startCol": 0,
        "startIndex": 0,
        "startLine": 1,
      }
    `);
  });

  test("", () => {
    const context = {
      source: fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8")
    };

    expect(
      getLocationByPath(["paths", "user", "parameters", "0"], context, "key")
    ).toMatchInlineSnapshot(`
      Object {
        "endCol": 47,
        "endIndex": 361,
        "endLine": 20,
        "startCol": 9,
        "startIndex": 322,
        "startLine": 20,
      }
    `);
  });

  test("", () => {
    const context = {
      source: fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8")
    };

    expect(
      getLocationByPath(
        ["paths", "user", "parameters", "0", "ttt"],
        context,
        "key"
      )
    ).toMatchInlineSnapshot(`
      Object {
        "endCol": 47,
        "endIndex": 361,
        "endLine": 20,
        "startCol": 9,
        "startIndex": 322,
        "startLine": 20,
      }
    `);
  });

  test("", () => {
    const context = {
      source: fs.readFileSync("./definitions/syntetic/syntetic-1.yaml", "utf-8")
    };

    expect(
      getLocationByPath(
        ["paths", "user", "get", "responses", "200"],
        context,
        "value"
      )
    ).toMatchInlineSnapshot(`
      Object {
        "endCol": 28,
        "endIndex": 600,
        "endLine": 30,
        "startCol": 9,
        "startIndex": 451,
        "startLine": 25,
      }
    `);
  });
});

describe("getCodeFrameForLocation", () => {
  test("", () => {
    const source = fs.readFileSync(
      "./definitions/syntetic/syntetic-1.yaml",
      "utf-8"
    );
    expect(getCodeFrameForLocation(276, 281, source)).toMatchInlineSnapshot(`
      "[90m1| [39m
      [90m0| servers:[39m
      [90m1|   - url: 'http://example[4m[31m.org'[90m[24m[39m
      [90m2|[39m[31m [39m
      [90m3| paths:[39m
      [90m4|   user:[39m"
    `);
  });

  test("", () => {
    const source = fs.readFileSync(
      "./definitions/syntetic/syntetic-1.yaml",
      "utf-8"
    );
    expect(getCodeFrameForLocation(276, 425, source)).toMatchInlineSnapshot(`
      "[90m-1| [39m
      [90m00| servers:[39m
      [90m01|   - url: 'http://example[4m[31m.org'[90m[24m[39m
      [90m02|[39m[31m [4m[31m[31m[24m[39m
      [90m03|[39m[31m [4m[31mpaths:[31m[24m[39m
      [90m04|[39m[31m [4m[31m  user:[31m[24m[39m
      [90m05|[39m[31m [4m[31m    parameters:[31m[24m[39m
      [90m06|[39m[31m [4m[31m      - $ref: '#/components/parameters/example'[31m[24m[39m
      [90m07|[39m[31m [4m[31m    get:[31m[24m[39m
      [90m08|[39m[31m [4m[31m      operationId: userGet[31m[24m[39m
      [90m09|[39m[31m [4m[31m      description: Get user[31m[24m[39m
      [90m10|       responses:[39m
      [90m11|         '200':[39m"
    `);
  });

  test("", () => {
    const source = fs.readFileSync(
      "./definitions/syntetic/syntetic-1.yaml",
      "utf-8"
    );
    expect(getCodeFrameForLocation(0, 7, source)).toMatchInlineSnapshot(`
      "[90m1| [4m[31mopenapi[90m[24m: 3.0.2[39m
      [90m2| info:[39m
      [90m3|   x-redocly-overlay:[39m"
    `);
  });

  test("", () => {
    const source = fs.readFileSync(
      "./definitions/syntetic/syntetic-1.yaml",
      "utf-8"
    );
    expect(getCodeFrameForLocation(0, 14, source)).toMatchInlineSnapshot(`
      "[90m1|[39m[31m [4m[31mopenapi: 3.0.2[31m[24m[39m
      [90m2| info:[39m
      [90m3|   x-redocly-overlay:[39m"
    `);
  });
});

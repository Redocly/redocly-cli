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
        "endIndex": 411,
        "endLine": 23,
        "startCol": 9,
        "startIndex": 406,
        "startLine": 23,
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
        "endCol": 7,
        "endIndex": 247,
        "endLine": 16,
        "startCol": 3,
        "startIndex": 243,
        "startLine": 16,
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
        "endCol": 7,
        "endIndex": 247,
        "endLine": 16,
        "startCol": 3,
        "startIndex": 243,
        "startLine": 16,
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
        "endIndex": 555,
        "endLine": 28,
        "startCol": 9,
        "startIndex": 406,
        "startLine": 23,
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
      "[90m1|   user:[39m
      [90m0|     # parameters:[39m
      [90m1|     #   -[4m[31m $ref[90m[24m: '#/components/parameters/example'[39m
      [90m2|     get:[39m
      [90m3|       operationId: userGet[39m"
    `);
  });

  test("", () => {
    const source = fs.readFileSync(
      "./definitions/syntetic/syntetic-1.yaml",
      "utf-8"
    );
    expect(getCodeFrameForLocation(276, 425, source)).toMatchInlineSnapshot(`
      "[90m-1|   user:[39m
      [90m00|     # parameters:[39m
      [90m01|     #   -[4m[31m $ref: '#/components/parameters/example'[90m[24m[39m
      [90m02|[39m[31m [4m[31m    get:[31m[24m[39m
      [90m03|[39m[31m [4m[31m      operationId: userGet[31m[24m[39m
      [90m04|[39m[31m [4m[31m      description: Get user[31m[24m[39m
      [90m05|[39m[31m [4m[31m      responses:[31m[24m[39m
      [90m06|[39m[31m [4m[31m        '200':[31m[24m[39m
      [90m07| [4m[31m          de[90m[24mscription: example description[39m
      [90m08|           content:[39m
      [90m09|             application/json:[39m"
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
      [90m3|   title: Example OpenAPI 3 definition. Valid.[39m"
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
      [90m3|   title: Example OpenAPI 3 definition. Valid.[39m"
    `);
  });
});

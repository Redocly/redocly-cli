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
        "endIndex": 281,
        "endLine": 17,
        "startCol": 9,
        "startIndex": 276,
        "startLine": 17,
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
        "endIndex": 241,
        "endLine": 14,
        "startCol": 9,
        "startIndex": 202,
        "startLine": 14,
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
        "endIndex": 241,
        "endLine": 14,
        "startCol": 9,
        "startIndex": 202,
        "startLine": 14,
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
        "endIndex": 425,
        "endLine": 22,
        "startCol": 9,
        "startIndex": 276,
        "startLine": 17,
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
      "[90m1|     get:[39m
      [90m0|       responses:[39m
      [90m1|         [4m[31m'200'[0m[24m:[39m
      [90m2|           description: example description[39m
      [90m3|           content:[39m"
    `);
  });

  test("", () => {
    const source = fs.readFileSync(
      "./definitions/syntetic/syntetic-1.yaml",
      "utf-8"
    );
    expect(getCodeFrameForLocation(276, 425, source)).toMatchInlineSnapshot(`
      "[90m-1|     get:[39m
      [90m00|       responses:[39m
      [90m01|         [4m[31m'200':[39m
      [90m02|[39m[31m           description: example description[0m
      [90m03|[39m[31m           content:[0m
      [90m04|[39m[31m             application/json:[0m
      [90m05|[39m[31m               schema:[0m
      [90m06|[39m[31m                 type: object[0m[24m[0m
      [90m07|   project:[39m
      [90m08|     get:[39m"
    `);
  });

  test("", () => {
    const source = fs.readFileSync(
      "./definitions/syntetic/syntetic-1.yaml",
      "utf-8"
    );
    expect(getCodeFrameForLocation(0, 7, source)).toMatchInlineSnapshot(`
      "[90m1| [4m[31mopenapi[0m[24m: 3.0.2[39m
      [90m2| info:[39m
      [90m3|   title: Example OpenAPI 3 definition. Valid.[39m"
    `);
  });

  test("", () => {
    const source = fs.readFileSync(
      "./definitions/syntetic/syntetic-1.yaml",
      "utf-8"
    );
    expect(getCodeFrameForLocation(0, 14, source)).toMatchInlineSnapshot(`
      "[90m1|[39m[31m [4m[31mopenapi: 3.0.2[0m[24m[0m
      [90m2| info:[39m
      [90m3|   title: Example OpenAPI 3 definition. Valid.[39m"
    `);
  });
});

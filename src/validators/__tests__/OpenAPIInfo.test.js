import { OpenAPIInfo, OpenAPILicense } from "./../OpenAPIInfo";

test("OpenAPIInfo resolver format", () => {
  expect(OpenAPIInfo).toMatchInlineSnapshot(`
    Object {
      "properties": Object {
        "license": Object {
          "validators": Object {
            "name": [Function],
          },
        },
      },
      "validators": Object {
        "title": [Function],
      },
    }
  `);
});

test("OpenAPIInfo resover validation of undefined title", () => {
  expect(
    OpenAPIInfo.validators.title()(undefined, { path: ["info"], pathStack: [] })
  ).toMatchInlineSnapshot(`
    Object {
      "message": "Info section must include title",
      "path": "/info",
      "pathStack": Array [],
      "severity": "ERROR",
      "value": undefined,
    }
  `);
});

test("OpenAPIInfo expect properties.license format", () => {
  expect(OpenAPIInfo.properties.license).toMatchInlineSnapshot(`
    Object {
      "validators": Object {
        "name": [Function],
      },
    }
  `);
});

test("OpenAPILicense resolver format", () => {
  expect(OpenAPILicense).toMatchInlineSnapshot(`
    Object {
      "validators": Object {
        "name": [Function],
      },
    }
  `);
});

test("OpenAPILicense check for undefined name", () => {
  expect(
    OpenAPILicense.validators.name()(undefined, {
      path: ["info", "license"],
      pathStack: []
    })
  ).toMatchInlineSnapshot(`
    Object {
      "message": "Name is required for the license object",
      "path": "/info/license",
      "pathStack": Array [],
      "severity": "ERROR",
      "value": undefined,
    }
  `);
});

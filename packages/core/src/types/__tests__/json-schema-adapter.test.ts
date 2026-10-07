import { getNodeTypesFromJSONSchema } from "../json-schema-adapter.js";

describe("getNodeTypesFromJSONSchema", () => {
  it("types the entries of a single-pattern object like additionalProperties and keeps the format", () => {
    const { ctx: types } = getNodeTypesFromJSONSchema("Catalogs", {
      type: "object",
      additionalProperties: false,
      patternProperties: {
        ".*": {
          type: "object",
          properties: {
            directory: { type: "string", format: "uri-reference" },
          },
        },
      },
    });

    expect(types["Catalogs"].additionalProperties).toBe(
      "Catalogs_additionalProperties"
    );
    expect(types["Catalogs_additionalProperties"].properties).toEqual({
      directory: { type: "string", format: "uri-reference" },
    });
  });

  it("picks the oneOf branch of an object with a formatted string without logging a format warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { ctx: types } = getNodeTypesFromJSONSchema("Root", {
      type: "object",
      properties: {
        markdoc: {
          oneOf: [
            { type: "boolean" },
            {
              type: "object",
              properties: {
                tagsFile: { type: "string", format: "uri-reference" },
              },
            },
          ],
        },
      },
    });

    const resolveMarkdoc = types["Root"].properties.markdoc as (
      value: unknown,
      key: string
    ) => unknown;

    expect(resolveMarkdoc({ tagsFile: "./tags.js" }, "markdoc")).toBe(
      "Root.markdoc_1"
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

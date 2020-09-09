import { parseYamlToDocument, makeConfigForRuleset } from "./utils";
import { validateDocument } from "../validate";
import { BaseResolver } from "../resolve";

describe('oas version detection', () => {
  it('should detect OpenAPI 3.x', async () => {
    const document = parseYamlToDocument(`
      openapi: 3.0.2
      info:
        title: OpenAPI example
    `);
    const { oasVersion } = await validateDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: makeConfigForRuleset({}),
    });
    expect(oasVersion).toEqual('3.0.2');
  })

  it('should detect Swagger 2.x', async () => {
    const document = parseYamlToDocument(`
      swagger: '2.0'
      info:
        title: Swagger example
    `);
    const { oasVersion } = await validateDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: makeConfigForRuleset({}),
    });
    expect(oasVersion).toEqual('2.0');
  })
});
import { lintExpression } from '../../runtime-expressions/lint.js';

describe('lintExpression', () => {
  describe('general cases', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('$statusCode == 201')).not.toThrow();
      expect(() => lintExpression('{$statusCode == 201 || $statusCode != 200}')).not.toThrow();
      expect(() =>
        lintExpression('$statusCode == 201 && $statusCode != 200 || $url == "test"')
      ).not.toThrow();
      expect(() =>
        lintExpression('{$statusCode == 201 && $statusCode != 200 || $url == "test"}')
      ).not.toThrow();
      expect(() => lintExpression('$response.header.Server == 201')).not.toThrow();
      expect(() => lintExpression('{$response.header.Server == 201}')).not.toThrow();
      expect(() => lintExpression('$response.body#/device_code')).not.toThrow();
      expect(() => lintExpression('3.14 == 3.14')).not.toThrow();
      expect(() => lintExpression('$response.body#/someFloat > 3.14')).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() => lintExpression('foo bar')).toThrowError(
        'Runtime expression is not valid: foo bar'
      );
      expect(() =>
        lintExpression("$response.body.name == 'Mermaid Treasure Identification and Analysis'")
      ).toThrowError(
        "Runtime expression is not valid: $response.body.name == 'Mermaid Treasure Identification and Analysis'"
      );
    });
  });

  describe('$url', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('$url == "http://test.com"')).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() =>
        lintExpression("$url.body.name == 'Mermaid Treasure Identification and Analysis'")
      ).toThrowError(
        "Runtime expression is not valid: $url.body.name == 'Mermaid Treasure Identification and Analysis'"
      );
    });
  });

  describe('$method', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression("$method == 'GET'")).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() =>
        lintExpression("$method.body.name == 'Mermaid Treasure Identification and Analysis'")
      ).toThrowError(
        "Runtime expression is not valid: $method.body.name == 'Mermaid Treasure Identification and Analysis'"
      );
    });
  });

  describe('$statusCode', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('$statusCode == 200')).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() =>
        lintExpression("$statusCode.body.name == 'Mermaid Treasure Identification and Analysis'")
      ).toThrowError(
        "Runtime expression is not valid: $statusCode.body.name == 'Mermaid Treasure Identification and Analysis'"
      );
    });
  });

  describe('$request', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('$request.body#/name != 42')).not.toThrow();
      expect(() => lintExpression("$request.header.accept == 'application/json'")).not.toThrow();
      expect(() => lintExpression('$request.path.pageId <= 3')).not.toThrow();
      expect(() => lintExpression('$request.query.pageSize != 2')).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() => lintExpression('$request.body.name != Jim')).toThrowError(
        'Runtime expression is not valid: $request.body.name != Jim'
      );
      expect(() =>
        lintExpression("$request == 'Mermaid Treasure Identification and Analysis'")
      ).toThrowError(
        "Runtime expression is not valid: $request == 'Mermaid Treasure Identification and Analysis'"
      );
    });
  });

  describe('$response', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('$response.body#/name != "Jim"')).not.toThrow();
      expect(() => lintExpression('$response.body#/page/hasPrevPage == false')).not.toThrow();
      expect(() => lintExpression('$response.body#/page/hasPrevPage != null')).not.toThrow();
      expect(() => lintExpression('$response.body#/name')).not.toThrow();
      expect(() => lintExpression('$response.body#/items == []')).not.toThrow();
      expect(() => lintExpression('$response.body#/name/bob/sam')).not.toThrow();
      expect(() => lintExpression('{$response.body#/name/bob/sam}')).not.toThrow();
      expect(() => lintExpression('{$response.header.accept}')).not.toThrow();
      expect(() => lintExpression("$response.header.accept == 'application/json'")).not.toThrow();
      expect(() => lintExpression('$response.path.pageId >= 3')).not.toThrow();
      expect(() => lintExpression('$response.query.pageSize > 2')).not.toThrow();
      expect(() => lintExpression('$response.body')).not.toThrow();
      expect(() => lintExpression('$response.body == "some string"')).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() => lintExpression('$response.body.name == Jim')).toThrowError(
        'Runtime expression is not valid: $response.body.name == Jim'
      );
      expect(() =>
        lintExpression("$response.test == 'Mermaid Treasure Identification and Analysis'")
      ).toThrowError(
        "Runtime expression is not valid: $response.test == 'Mermaid Treasure Identification and Analysis'"
      );
    });
  });

  describe('$inputs', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('$inputs.events.some-event.id == 42')).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() =>
        lintExpression("$inputs.body#/name == 'Mermaid Treasure Identification and Analysis'")
      ).toThrowError(
        "Runtime expression is not valid: $inputs.body#/name == 'Mermaid Treasure Identification and Analysis'"
      );
    });
  });

  describe('$outputs', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('$outputs.events.some-event.id == 42')).not.toThrow();
    });

    it('should not throw an error if the expression is not valid', () => {
      expect(() =>
        lintExpression("$outputs#/name == 'Mermaid Treasure Identification and Analysis'")
      ).toThrowError(
        "Runtime expression is not valid: $outputs#/name == 'Mermaid Treasure Identification and Analysis'"
      );
    });

    it('should not throw an error in situations where the output named property return payloads, references may be made to portions of the response body', () => {
      expect(() =>
        lintExpression(
          "$outputs.mappedResponse#/name == 'Mermaid Treasure Identification and Analysis'"
        )
      ).not.toThrow();
    });
  });

  describe('$workflows', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('{$workflows.foo.inputs.username == "Johny"}')).not.toThrow();
    });

    it('should not throw an error in situations where the workflow output named property return payloads, references may be made to portions of the response body', () => {
      expect(() =>
        lintExpression(
          "$workflows.foo.outputs.mappedResponse#/name == 'Mermaid Treasure Identification and Analysis'"
        )
      ).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() =>
        lintExpression(
          "$workflow.foo.inputs.username == 'Mermaid Treasure Identification and Analysis'"
        )
      ).toThrowError(
        "Runtime expression is not valid: $workflow.foo.inputs.username == 'Mermaid Treasure Identification and Analysis'"
      );
    });
  });

  describe('$steps', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('{$steps.someStep.pets == "Johny"}')).not.toThrow();
      expect(() => lintExpression('$steps.someStep.pets')).not.toThrow();
    });

    it('should not throw an error in situations where the step output named property return payloads, references may be made to portions of the response body', () => {
      expect(() => lintExpression("$steps.someStepId.outputs.pets#/0/id == 'uuid'")).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() => lintExpression("$step.foo.outputs.username == 'Bob'")).toThrowError(
        "Runtime expression is not valid: $step.foo.outputs.username == 'Bob'"
      );
      expect(() => lintExpression('$step.foo.outputs#/username/test')).toThrowError(
        'Runtime expression is not valid: $step.foo.outputs#/username/test'
      );
    });
  });

  describe('$sourceDescriptions', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('{$sourceDescriptions.petstoreDescription.url}')).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() =>
        lintExpression("{$sourceDescriptions.petstoreDescription.url#/paths} == 'Bob'")
      ).toThrowError(
        "Runtime expression is not valid: {$sourceDescriptions.petstoreDescription.url#/paths} == 'Bob'"
      );
    });
  });

  describe('$components', () => {
    it('should not throw an error and return the parsed expression tokens', () => {
      expect(() => lintExpression('$components.parameters.foo')).not.toThrow();
    });

    it('should throw an error if the expression is not valid', () => {
      expect(() => lintExpression('test $components.parameters.foo')).toThrowError(
        'Runtime expression is not valid: test $components.parameters.foo'
      );
    });
  });

  describe('$faker', () => {
    it('should throw an error if the expression is not valid', () => {
      expect(() => lintExpression('$faker.number.integer({ min: 1, max: 10 })')).toThrowError(
        'Runtime expression is not valid: $faker.number.integer({ min: 1, max: 10 })'
      );
      expect(() => lintExpression('$faker.sentence.integer({ min: 1, max: 10 })')).toThrowError(
        'Runtime expression is not valid: $faker.sentence.integer({ min: 1, max: 10 })'
      );
    });
  });
});

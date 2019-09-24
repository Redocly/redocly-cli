import { validateFromFile } from '../index';

test('validate simple document', () => {
  expect(
    validateFromFile('./test/specs/openapi/simple.yaml'),
  ).toMatchInlineSnapshot('Array []');
});

test('Validate simple valid OpenAPI document', () => {
  expect(
    validateFromFile('./test/specs/openapi/test-2.yaml'),
  ).toMatchInlineSnapshot('Array []');
});

test('Validate from invalid file', () => {
  expect(
    validateFromFile('./test/specs/openapi/test-invalid-1.yaml'),
  ).toMatchInlineSnapshot('Array []');
});

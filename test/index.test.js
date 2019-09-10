import { validateFromFile } from './../lib';

test('validate correct spec', () => {
    expect(validateFromFile('./test/specs/openapi/valid-1.yaml')).toBe(null);
});
import yaml from 'yaml';
import fs from 'fs';
import resolve from './../lib/resolver';

test('Resolve a document with no references, no changes expected', () => {
    const doc = yaml.parse(fs.readFileSync('./test/specs/openapi/flat-invalid.yaml', 'utf-8'));
    expect(resolve(doc)).toEqual(doc);
});

// test('Resolve a document with a 1-level references', () => {
//     const doc = yaml.parse(fs.readFileSync('./test/specs/openapi/one-deep-invalid.yaml', 'utf-8'));
//     expect(resolve(doc)).toEqual(doc);
// });

test('Resolve a document with 2+ levels deep references', () => {});
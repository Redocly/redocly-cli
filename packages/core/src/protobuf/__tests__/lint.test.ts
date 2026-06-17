import { describe, expect, it } from 'vitest';

import { createConfig } from '../../config/load.js';
import { lintProtoDocument } from '../lint.js';
import { makeProtoDocumentFromString } from '../parse.js';

describe('lintProtoDocument', () => {
  it('reports the initial native Protobuf rules', async () => {
    const config = await createConfig({
      protobufRules: {
        'protobuf/package-defined': 'error',
        'protobuf/message-pascal-case': 'error',
        'protobuf/field-snake-case': 'error',
      },
    });
    const document = makeProtoDocumentFromString(
      `
syntax = "proto3";

message user {
  string userId = 1;
}
`,
      'users.proto'
    );

    const problems = await lintProtoDocument({ document, config });

    expect(problems.map((problem) => problem.ruleId)).toEqual([
      'protobuf/package-defined',
      'protobuf/message-pascal-case',
      'protobuf/field-snake-case',
    ]);
  });

  it('does not report valid names', async () => {
    const config = await createConfig({
      protobufRules: {
        'protobuf/package-defined': 'error',
        'protobuf/message-pascal-case': 'error',
        'protobuf/field-snake-case': 'error',
      },
    });
    const document = makeProtoDocumentFromString(
      `
syntax = "proto3";
package acme.users.v1;

message User {
  string user_id = 1;
}
`,
      'users.proto'
    );

    expect(lintProtoDocument({ document, config })).toEqual([]);
  });
});

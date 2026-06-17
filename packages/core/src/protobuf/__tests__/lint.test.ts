import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createConfig } from '../../config/load.js';
import { lint } from '../../lint.js';
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
    expect(problems[1].location[0]).toMatchObject({
      pointer: '#/messages/user',
      start: { line: 4, col: 9 },
    });
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

  it('lints explicit .proto files through the generic lint entrypoint', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'redocly-proto-lint-'));
    const protoPath = path.join(dir, 'users.proto');
    fs.writeFileSync(
      protoPath,
      `syntax = "proto3";

message user {
  string userId = 1;
}
`
    );
    const config = await createConfig({
      protobufRules: {
        'protobuf/package-defined': 'error',
        'protobuf/message-pascal-case': 'error',
        'protobuf/field-snake-case': 'error',
      },
    });

    try {
      const problems = await lint({ ref: protoPath, config });

      expect(problems.map((problem) => problem.ruleId)).toEqual([
        'protobuf/package-defined',
        'protobuf/message-pascal-case',
        'protobuf/field-snake-case',
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

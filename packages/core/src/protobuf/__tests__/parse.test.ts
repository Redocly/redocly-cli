import { describe, expect, it } from 'vitest';

import { ProtoUnsupportedSyntaxError } from '../../errors/protobuf-errors.js';
import { parseProtoDocument } from '../parse.js';

describe('parseProtoDocument', () => {
  it('normalizes proto3 declarations into a parser-independent document', () => {
    const document = parseProtoDocument(
      `
syntax = "proto3";
package acme.users.v1;

message User {
  string user_id = 1;
}

service UserService {
  rpc GetUser (User) returns (User);
}
`,
      'users.proto'
    );

    expect(document.syntax?.value).toBe('proto3');
    expect(document.package?.name).toBe('acme.users.v1');
    expect(document.messages[0].name).toBe('User');
    expect(document.messages[0].fields[0]).toMatchObject({
      name: 'user_id',
      type: 'string',
      number: 1,
    });
    expect(document.services[0].rpcs[0]).toMatchObject({
      name: 'GetUser',
      requestType: 'User',
      responseType: 'User',
    });
  });

  it('rejects non-proto3 syntax', () => {
    expect(() =>
      parseProtoDocument(
        `
syntax = "proto2";
package acme.users.v1;
`,
        'users.proto'
      )
    ).toThrow(ProtoUnsupportedSyntaxError);
  });
});

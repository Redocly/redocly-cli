import { describe, expect, it } from 'vitest';

import { ProtoParseError, ProtoUnsupportedSyntaxError } from '../../errors/protobuf-errors.js';
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

  it('preserves stable node pointers and identifier source locations', () => {
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

    expect(document.package?.location).toMatchObject({
      pointer: '#/package',
      start: { line: 3, col: 1 },
    });
    expect(document.messages[0].location).toMatchObject({
      pointer: '#/messages/User',
      start: { line: 5, col: 9 },
    });
    expect(document.messages[0].fields[0].location).toMatchObject({
      pointer: '#/messages/User/fields/user_id',
      start: { line: 6, col: 10 },
    });
    expect(document.services[0].location).toMatchObject({
      pointer: '#/services/UserService',
      start: { line: 9, col: 9 },
    });
    expect(document.services[0].rpcs[0].location).toMatchObject({
      pointer: '#/services/UserService/rpcs/GetUser',
      start: { line: 10, col: 7 },
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

  it('rejects missing syntax declarations', () => {
    expect(() =>
      parseProtoDocument(
        `
package acme.users.v1;

message User {}
`,
        'users.proto'
      )
    ).toThrow(ProtoUnsupportedSyntaxError);
  });

  it('converts protoc parse failures into ProtoParseError', () => {
    expect(() =>
      parseProtoDocument(
        `
syntax = "proto3";
message User {
  string name = ;
}
`,
        'users.proto'
      )
    ).toThrow(ProtoParseError);
  });
});

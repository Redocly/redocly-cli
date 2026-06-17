import type { Source } from '../resolve.js';
import type { Loc } from '../walk.js';

export type ProtoErrorLocation = {
  source?: Source;
  start?: Loc;
  end?: Loc;
};

export class ProtoParseError extends Error {
  constructor(
    message: string,
    public location?: ProtoErrorLocation
  ) {
    super(message);
    Object.setPrototypeOf(this, ProtoParseError.prototype);
  }
}

export class ProtoUnsupportedSyntaxError extends Error {
  constructor(
    public syntax: string | undefined,
    public location?: ProtoErrorLocation
  ) {
    super(
      syntax
        ? `Unsupported Protobuf syntax "${syntax}". Only proto3 is supported.`
        : 'Missing Protobuf syntax declaration. Only proto3 is supported.'
    );
    Object.setPrototypeOf(this, ProtoUnsupportedSyntaxError.prototype);
  }
}

export class ProtoImportResolutionError extends Error {
  constructor(
    public importPath: string,
    public location?: ProtoErrorLocation
  ) {
    super(`Failed to resolve Protobuf import "${importPath}".`);
    Object.setPrototypeOf(this, ProtoImportResolutionError.prototype);
  }
}

export class ProtoLocationError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ProtoLocationError.prototype);
  }
}

export class ProtoInternalError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ProtoInternalError.prototype);
  }
}

import {
  Oas3Rule,
  Oas3Preprocessor,
  Oas2Rule,
  Oas2Preprocessor,
} from './visitors';

export type RuleSet<T> = Record<string, T>;

export enum OasVersion {
  Version2 = 'oas2',
  Version3_0 = 'oas3_0',
  Version3_1 = 'oas3_1',
}

export enum OasMajorVersion {
  Version2 = 'oas2',
  Version3 = 'oas3',
}

export enum OasVersionField {
  Version2 = 'swagger',
  Version3 = 'openapi',
}

export type Oas3RuleSet = Record<string, Oas3Rule>;
export type Oas2RuleSet = Record<string, Oas2Rule>;
export type Oas3PreprocessorsSet = Record<string, Oas3Preprocessor>;
export type Oas2PreprocessorsSet = Record<string, Oas2Preprocessor>;
export type Oas3DecoratorsSet = Record<string, Oas3Preprocessor>;
export type Oas2DecoratorsSet = Record<string, Oas2Preprocessor>;

export function detectOpenAPI(root: any): OasVersion {
  if (typeof root !== 'object') {
    throw new Error(`Document must be JSON object, got ${typeof root}`);
  }

  const version2Value = root[OasVersionField.Version2];
  const version3Value = root[OasVersionField.Version3];

  if (!(version2Value || version3Value)) {
    throw new Error('This doesn’t look like an OpenAPI document.\n');
  }

  if (version3Value && typeof version3Value !== 'string') {
    throw new Error(`Invalid OpenAPI version: should be a string but got "${typeof version3Value}"`);
  }

  if (version3Value && version3Value.startsWith('3.0')) {
    return OasVersion.Version3_0;
  }

  if (version3Value && version3Value.startsWith('3.1')) {
    return OasVersion.Version3_1;
  }

  if (version2Value && version2Value === '2.0') {
    return OasVersion.Version2;
  }

  throw new Error(`Unsupported OpenAPI Version: ${version3Value || version2Value}`);
}

export function openAPIMajor(version: OasVersion): OasMajorVersion {
  if (version === OasVersion.Version2) {
    return OasMajorVersion.Version2;
  } else {
    return OasMajorVersion.Version3;
  }
}

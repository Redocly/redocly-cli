import { Oas3Rule, Oas3Preprocessor, Oas2Rule, Oas2Preprocessor } from './visitors';

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

  if (!(root.openapi || root.swagger)) {
    throw new Error('This doesn’t look like an OpenAPI document.\n');
  }

  if (root.openapi && typeof root.openapi !== 'string') {
    throw new Error(`Invalid OpenAPI version: should be a string but got "${typeof root.openapi}"`);
  }

  if (root.openapi && root.openapi.startsWith('3.0')) {
    return OasVersion.Version3_0;
  }

  if (root.openapi && root.openapi.startsWith('3.1')) {
    return OasVersion.Version3_1;
  }

  if (root.swagger && root.swagger === '2.0') {
    return OasVersion.Version2;
  }

  throw new Error(`Unsupported OpenAPI Version: ${root.openapi || root.swagger}`);
}

export function openAPIMajor(version: OasVersion): OasMajorVersion {
  if (version === OasVersion.Version2) {
    return OasMajorVersion.Version2;
  } else {
    return OasMajorVersion.Version3;
  }
}

import { BaseResolver, resolveDocument, Document } from './resolve';

import {
  Oas3Rule,
  normalizeVisitors,
  Oas3Preprocessor,
  Oas2Rule,
  Oas2Preprocessor,
} from './visitors';
import { Oas3Types } from './types/oas3';
import { Oas2Types } from './types/oas2';
import { NodeType } from './types';
import { WalkContext, walkDocument } from './walk';
import { LintConfig, Config } from './config/config';
import { normalizeTypes } from './types';
import { initRules } from './config/rules';
import { releaseAjvInstance } from './rules/ajv';

export enum OasVersion {
  Version2 = 'oas2',
  Version3_0 = 'oas3_0',
}

export enum OasMajorVersion {
  Version2 = 'oas2',
  Version3 = 'oas3',
}

export type RuleSet<T> = Record<string, T>;
export type Oas3RuleSet = Record<string, Oas3Rule>;
export type Oas2RuleSet = Record<string, Oas2Rule>;
export type Oas3PreprocessorsSet = Record<string, Oas3Preprocessor>;
export type Oas2PreprocessorsSet = Record<string, Oas2Preprocessor>;
export type Oas3DecoratorsSet = Record<string, Oas3Preprocessor>;
export type Oas2DecoratorsSet = Record<string, Oas2Preprocessor>;

export async function validate(opts: {
  ref: string;
  config: Config;
  externalRefResolver?: BaseResolver;
}) {
  const { ref, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;
  const document = (await externalRefResolver.resolveDocument(null, ref)) as Document;
  return validateDocument({
    document,
    ...opts,
    externalRefResolver,
    config: opts.config.lint,
  });
}

export async function validateDocument(opts: {
  document: Document;
  config: LintConfig;
  customTypes?: Record<string, NodeType>;
  externalRefResolver: BaseResolver;
}) {
  releaseAjvInstance(); // FIXME: preprocessors can modify nodes which are then cached to ajv-instance by absolute path

  const { document, customTypes, externalRefResolver, config } = opts;
  const oasVersion = detectOpenAPI(document.parsed);
  const oasMajorVersion = openAPIMajor(oasVersion);

  const rules = config.getRulesForOasVersion(oasMajorVersion);
  const types = normalizeTypes(
    config.extendTypes(
      customTypes ?? oasMajorVersion === OasMajorVersion.Version3 ? Oas3Types : Oas2Types,
      oasVersion,
    ),
  );

  const ctx: WalkContext = {
    messages: [],
    oasVersion: oasVersion,
  };

  const preprocessors = initRules(rules as any, config, 'preprocessors', oasVersion);
  const regularRules = initRules(rules as any, config, 'rules', oasVersion);

  const normalizedVisitors = normalizeVisitors([...preprocessors, ...regularRules], types);

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.DefinitionRoot,
    externalRefResolver,
  });

  walkDocument({
    document,
    rootType: types.DefinitionRoot,
    normalizedVisitors,
    resolvedRefMap,
    ctx,
  });

  return ctx.messages.map((message) => config.addMessageToIgnore(message));
}

export function detectOpenAPI(root: any): OasVersion {
  if (typeof root !== 'object') {
    throw new Error(`Document must be JSON object, got ${typeof root}`);
  }

  if (root.openapi && root.openapi.startsWith('3.0')) {
    return OasVersion.Version3_0;
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

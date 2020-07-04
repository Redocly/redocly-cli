import { BaseResolver, resolveDocument, Document } from './resolve';

import { Oas3Rule, normalizeVisitors, Oas3Preprocessor } from './visitors';
import { Oas3Types } from './types/oas3';
import { NodeType } from './types';
import { WalkContext, walkDocument } from './walk';
import { LintConfig } from './config/config';
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
export type Oas3PreprocessorsSet = Record<string, Oas3Preprocessor>;

export async function validate(opts: {
  ref: string;
  config: LintConfig;
  externalRefResolver?: BaseResolver;
}) {
  const { ref, externalRefResolver = new BaseResolver() } = opts;
  const document = (await externalRefResolver.resolveDocument(null, ref)) as Document;
  return validateDocument({
    document,
    ...opts,
  });
}

export async function validateDocument(opts: {
  document: Document;
  config: LintConfig;
  customTypes?: Record<string, NodeType>;
  externalRefResolver?: BaseResolver;
}) {
  releaseAjvInstance(); // FIXME: preprocessors can modify nodes which are then cached to ajv-instance by absolute path

  const { document, customTypes, externalRefResolver = new BaseResolver(), config } = opts;
  switch (detectOpenAPI(document.parsed)) {
    case OasVersion.Version2:
      throw new Error('OAS2 is not supported yet');
    case OasVersion.Version3_0: {
      const oas3Rules = config.getRulesForOasVersion(OasVersion.Version3_0);

      const types = normalizeTypes(
        config.extendTypes(customTypes ?? Oas3Types, OasVersion.Version3_0),
      );

      const ctx: WalkContext = {
        messages: [],
        oasVersion: OasVersion.Version3_0,
      };

      const preprocessors = initRules(oas3Rules, config, 'preprocessors');
      const rules = initRules(oas3Rules, config, 'rules');

      const normalizedVisitors = normalizeVisitors([...preprocessors, ...rules], types);

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
  }
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

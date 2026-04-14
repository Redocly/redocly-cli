import { makeBundleVisitor } from '../bundle/bundle-visitor.js';
import { type Config } from '../config/config.js';
import { initRules } from '../config/rules.js';
import { type RuleSeverity } from '../config/types.js';
import { RemoveUnusedComponents as RemoveUnusedComponentsOas2 } from '../decorators/oas2/remove-unused-components.js';
import { RemoveUnusedComponents as RemoveUnusedComponentsOas3 } from '../decorators/oas3/remove-unused-components.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';
import { resolveDocument, type Document, type BaseResolver } from '../resolve.js';
import { normalizeTypes, type NormalizedNodeType, type NodeType } from '../types/index.js';
import { normalizeVisitors } from '../visitors.js';
import { walkDocument, type WalkContext, type NormalizedProblem } from '../walk.js';

export type CoreBundleOptions = {
  externalRefResolver?: BaseResolver;
  config: Config;
  dereference?: boolean;
  base?: string | null;
  removeUnusedComponents?: boolean;
  keepUrlRefs?: boolean;
  componentRenamingConflicts?: RuleSeverity;
};

type BundleContext = WalkContext;

export type BundleResult = {
  bundle: Document;
  problems: NormalizedProblem[];
  fileDependencies: Set<string>;
  rootType: NormalizedNodeType;
  refTypes?: Map<string, NormalizedNodeType>;
  visitorsData: Record<string, Record<string, unknown>>;
};

export async function bundleDocument(opts: {
  document: Document;
  config: Config;
  types: Record<string, NodeType>;
  externalRefResolver: BaseResolver;
  dereference?: boolean;
  removeUnusedComponents?: boolean;
  keepUrlRefs?: boolean;
  componentRenamingConflicts?: RuleSeverity;
}): Promise<BundleResult> {
  const {
    document,
    config,
    types,
    externalRefResolver,
    dereference = false,
    removeUnusedComponents = false,
    keepUrlRefs = false,
    componentRenamingConflicts,
  } = opts;
  const specVersion = detectSpec(document.parsed);
  const specMajorVersion = getMajorSpecVersion(specVersion);
  const rules = config.getRulesForSpecVersion(specMajorVersion);
  const normalizedTypes = normalizeTypes(config.extendTypes(types, specVersion), config);

  const preprocessors = initRules(rules, config, 'preprocessors', specVersion);
  const decorators = initRules(rules, config, 'decorators', specVersion);

  const ctx: BundleContext = {
    problems: [],
    specVersion,
    config,
    refTypes: new Map<string, NormalizedNodeType>(),
    visitorsData: {},
  };

  let resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: normalizedTypes.Root,
    externalRefResolver,
  });

  if (preprocessors.length > 0) {
    // Make additional pass to resolve refs defined in preprocessors.
    walkDocument({
      document,
      rootType: normalizedTypes.Root as NormalizedNodeType,
      normalizedVisitors: normalizeVisitors(preprocessors, normalizedTypes),
      resolvedRefMap,
      ctx,
    });
    resolvedRefMap = await resolveDocument({
      rootDocument: document,
      rootType: normalizedTypes.Root,
      externalRefResolver,
    });
  }

  const bundleVisitor = normalizeVisitors(
    [
      {
        severity: 'error',
        ruleId: 'bundler',
        visitor: makeBundleVisitor({
          version: specMajorVersion,
          dereference,
          rootDocument: document,
          resolvedRefMap,
          keepUrlRefs,
          componentRenamingConflicts,
        }),
      },
      ...decorators.filter((decorator) => decorator.ruleId !== 'remove-unused-components'),
    ],
    normalizedTypes
  );

  walkDocument({
    document,
    rootType: normalizedTypes.Root,
    normalizedVisitors: bundleVisitor,
    resolvedRefMap,
    ctx,
  });

  const shouldRemoveUnused =
    removeUnusedComponents ||
    config.getDecoratorSettings('remove-unused-components', specVersion).severity !== 'off';

  if (shouldRemoveUnused) {
    const postBundleRefMap = await resolveDocument({
      rootDocument: document,
      rootType: normalizedTypes.Root,
      externalRefResolver,
    });
    const postBundleVisitors = normalizeVisitors(
      [
        {
          severity: 'error',
          ruleId: 'remove-unused-components',
          visitor:
            specMajorVersion === 'oas2'
              ? RemoveUnusedComponentsOas2({})
              : RemoveUnusedComponentsOas3({}),
        },
      ],
      normalizedTypes
    );

    walkDocument({
      document,
      rootType: normalizedTypes.Root,
      normalizedVisitors: postBundleVisitors,
      resolvedRefMap: postBundleRefMap,
      ctx,
    });
  }

  return {
    bundle: document,
    problems: ctx.problems.map((problem) => config.addProblemToIgnore(problem)),
    fileDependencies: externalRefResolver.getFiles(),
    rootType: normalizedTypes.Root,
    refTypes: ctx.refTypes,
    visitorsData: ctx.visitorsData,
  };
}

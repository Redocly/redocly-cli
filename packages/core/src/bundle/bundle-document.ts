import { applyOverlay } from '../bundle/apply-overlay.js';
import { makeBundleVisitor } from '../bundle/bundle-visitor.js';
import { type Config } from '../config/config.js';
import { initRules } from '../config/rules.js';
import { type RuleSeverity } from '../config/types.js';
import { RemoveUnusedComponents as RemoveUnusedComponentsOas2 } from '../decorators/oas2/remove-unused-components.js';
import { RemoveUnusedComponents as RemoveUnusedComponentsOas3 } from '../decorators/oas3/remove-unused-components.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';
import {
  resolveDocument,
  type Document,
  type BaseResolver,
  type ResolvedRefMap,
} from '../resolve.js';
import { normalizeTypes, type NormalizedNodeType, type NodeType } from '../types/index.js';
import { VERSION_PATTERN, type Overlay1Definition } from '../typings/overlay.js';
import { HandledError } from '../utils/error.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { normalizeVisitors } from '../visitors.js';
import { walkDocument, type WalkContext, type NormalizedProblem } from '../walk.js';

export type ComponentNamesStrategy = 'basename' | 'title';

export type CoreBundleOptions = {
  externalRefResolver?: BaseResolver;
  config: Config;
  dereference?: boolean;
  base?: string | null;
  removeUnusedComponents?: boolean;
  keepUrlRefs?: boolean;
  componentRenamingConflicts?: RuleSeverity;
  componentNamesStrategy?: ComponentNamesStrategy;
  overlays?: string[];
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
  componentNamesStrategy?: ComponentNamesStrategy;
  overlays?: string[];
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
    componentNamesStrategy = 'basename',
    overlays = [],
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

  const makeBundler = (refMap: ResolvedRefMap, dereferenceRefs: boolean) => ({
    severity: 'error' as const,
    ruleId: 'bundler',
    visitor: makeBundleVisitor({
      version: specMajorVersion,
      dereference: dereferenceRefs,
      rootDocument: document,
      resolvedRefMap: refMap,
      keepUrlRefs,
      componentRenamingConflicts,
      componentNamesStrategy,
    }),
  });

  const decoratorVisitors = decorators.filter(
    (decorator) => decorator.ruleId !== 'remove-unused-components'
  );

  // With overlays, dereferencing and decorators wait until the overlays are applied (see below).
  walkDocument({
    document,
    rootType: normalizedTypes.Root,
    normalizedVisitors: normalizeVisitors(
      overlays.length > 0
        ? [makeBundler(resolvedRefMap, false)]
        : [makeBundler(resolvedRefMap, dereference), ...decoratorVisitors],
      normalizedTypes
    ),
    resolvedRefMap,
    ctx,
  });

  if (overlays.length > 0) {
    for (const overlayRef of overlays) {
      const overlay = await externalRefResolver
        .resolveDocument<Overlay1Definition>(null, overlayRef, true)
        .catch((error) => {
          throw new HandledError(`Failed to load overlay at ${overlayRef}: ${error.message}`);
        });
      if (overlay instanceof Error) {
        throw overlay;
      }
      const overlayVersion = isPlainObject(overlay.parsed) ? overlay.parsed.overlay : undefined;
      if (typeof overlayVersion !== 'string' || !VERSION_PATTERN.test(overlayVersion)) {
        throw new HandledError(`${overlayRef} is not an Overlay 1.0, 1.1, or 1.2 document.`);
      }
      ctx.problems.push(...applyOverlay(document, overlay, externalRefResolver));
    }

    // Bundle again to pull in the files the overlays reference, then dereference and decorate, so a
    // component change reaches every use and overlay targets never meet circular references.
    const overlaidRefMap = await resolveDocument({
      rootDocument: document,
      rootType: normalizedTypes.Root,
      externalRefResolver,
    });
    const overlaidCtx: BundleContext = { ...ctx, problems: [] };
    walkDocument({
      document,
      rootType: normalizedTypes.Root,
      normalizedVisitors: normalizeVisitors(
        [makeBundler(overlaidRefMap, dereference), ...decoratorVisitors],
        normalizedTypes
      ),
      resolvedRefMap: overlaidRefMap,
      ctx: overlaidCtx,
    });
    // References that could not be resolved are reported again by this pass; keep the first report.
    const reported = new Set(ctx.problems.map(({ ruleId, message }) => `${ruleId}:${message}`));
    ctx.problems.push(
      ...overlaidCtx.problems.filter(({ ruleId, message }) => !reported.has(`${ruleId}:${message}`))
    );
  }

  if (
    removeUnusedComponents ||
    config.getDecoratorSettings('remove-unused-components', specVersion).severity !== 'off'
  ) {
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

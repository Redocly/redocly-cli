import {
  typeOf,
  type DiffResult,
  type JudgedChange,
  type Location,
  type LocatedNode,
} from '@redocly/openapi-core';

import { formatPath } from '../../../utils/miscellaneous.js';
import { lineColOf } from './location.js';

function toJsonLocation(location: Location) {
  const { file, line, col } = lineColOf(location);
  return { file, pointer: location.pointer, line, col };
}

function toJsonNode({ location, value }: LocatedNode) {
  return { ...toJsonLocation(location), value };
}

// Fields a change does not have stay undefined, and JSON.stringify leaves them out.
export function toJsonChange(change: JudgedChange) {
  return {
    key: change.key,
    typeName: typeOf(change.node),
    kind: change.kind,
    impact: change.impact,
    verdicts: change.verdicts.map(({ location, ...verdict }) => ({
      ...verdict,
      location: toJsonLocation(location),
    })),
    property: change.kind === 'modified' ? change.property : undefined,
    base: 'base' in change ? toJsonNode(change.base) : undefined,
    revision: 'revision' in change ? toJsonNode(change.revision) : undefined,
  };
}

// The problems met while preparing the documents are printed apart from the report.
export function jsonDiff(result: DiffResult): string {
  const report = {
    reportVersion: '1',
    files: { base: formatPath(result.files.base), revision: formatPath(result.files.revision) },
    specVersions: result.specVersions,
    infoVersions: result.infoVersions,
    summary: result.summary,
    bump: result.bump,
    changes: result.changes.map(toJsonChange),
  };
  return JSON.stringify(report, null, 2);
}

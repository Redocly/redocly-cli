import { describe, it, expect } from 'vitest';
import { makeDocumentFromString } from '../../../resolve.js';
import { Config } from '../../../config/index.js';
import { createEntityTypes } from '../../../types/entity-yaml.js';
import { normalizeTypes } from '../../../types/index.js';
import { normalizeVisitors } from '../../../visitors.js';
import { walkDocument } from '../../../walk.js';
import { EntityKeyValid } from '../entity-key-valid.js';
import type { WalkContext } from '../../../walk.js';
import { entityFileSchema, entityFileDefaultSchema } from '@redocly/config';

function lintEntityKey(source: string): WalkContext['problems'] {
  const document = makeDocumentFromString(source, '/test.yaml');
  const entityTypes = createEntityTypes(entityFileSchema, entityFileDefaultSchema);
  const types = normalizeTypes(entityTypes);

  const ctx: WalkContext = {
    problems: [],
    specVersion: 'oas3_0',
    config: {} as Config,
    visitorsData: {},
  };

  const rules = [
    {
      severity: 'error' as const,
      ruleId: 'entity key-valid',
      visitor: EntityKeyValid({ severity: 'error' }) as any,
    },
  ];

  const normalizedVisitors = normalizeVisitors(rules as any, types);

  walkDocument({
    document,
    rootType: types.EntityFileDefault,
    normalizedVisitors,
    resolvedRefMap: new Map(),
    ctx,
  });

  return ctx.problems;
}

describe('EntityKeyValid rule', () => {
  it('should pass for valid entity key', () => {
    const problems = lintEntityKey(`
type: user
key: valid-key-123
title: Valid User
`);
    expect(problems).toHaveLength(0);
  });

  it('should fail for key that is too short', () => {
    const problems = lintEntityKey(`
type: user
key: a
title: Valid User
`);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('at least 2 characters');
  });

  it('should fail for key with uppercase letters', () => {
    const problems = lintEntityKey(`
type: user
key: Invalid-Key
title: Valid User
`);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('lowercase letters');
  });

  it('should fail for key starting with hyphen', () => {
    const problems = lintEntityKey(`
type: user
key: -invalid-key
title: Valid User
`);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('cannot start or end with a hyphen');
  });

  it('should fail for key ending with hyphen', () => {
    const problems = lintEntityKey(`
type: user
key: invalid-key-
title: Valid User
`);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('cannot start or end with a hyphen');
  });

  it('should fail for key with invalid characters', () => {
    const problems = lintEntityKey(`
type: user
key: invalid_key@
title: Valid User
`);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('lowercase letters');
  });

  it('should fail for key that exceeds maximum length', () => {
    const longKey = 'a'.repeat(151);
    const problems = lintEntityKey(`
type: user
key: ${longKey}
title: Valid User
`);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('must not exceed 150 characters');
  });

  it('should fail for non-string key', () => {
    const problems = lintEntityKey(`
type: user
key: 123
title: Valid User
`);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('must be a string');
  });
});

import { Async2Rule } from '../../visitors';
import { Assertions } from '../common/assertions';
import { Spec } from '../common/spec';

export const rules = {
  spec: Spec as Async2Rule,
  assertions: Assertions,
  // 'spec-strict-refs': SpecStrictRefs,
};

export const preprocessors = {};

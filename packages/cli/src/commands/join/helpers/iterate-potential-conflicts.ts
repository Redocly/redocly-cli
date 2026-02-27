import { dequal } from '@redocly/openapi-core';
import { green } from 'colorette';

import { COMPONENTS } from '../../split/types.js';
import { duplicateTagDescriptionWarning } from './duplicate-tag-description-warning.js';
import { filterConflicts } from './filter-conflicts.js';
import { prefixTagSuggestion } from './prefix-tag-suggestion.js';
import { showConflicts } from './show-conflicts.js';

function doesComponentsDiffer(curr: object, next: object) {
  return !dequal(Object.values(curr)[0], Object.values(next)[0]);
}

function validateComponentsDifference(files: any) {
  let isDiffer = false;
  for (let i = 0, len = files.length; i < len; i++) {
    const next = files[i + 1];
    if (next && doesComponentsDiffer(files[i], next)) {
      isDiffer = true;
    }
  }
  return isDiffer;
}

let potentialConflictsTotal = 0;

export function iteratePotentialConflicts({
  potentialConflicts,
  withoutXTagGroups,
}: {
  potentialConflicts: any;
  withoutXTagGroups?: boolean;
}) {
  for (const group of Object.keys(potentialConflicts)) {
    for (const [key, value] of Object.entries(potentialConflicts[group])) {
      const conflicts = filterConflicts(value as object);
      if (conflicts.length) {
        if (group === COMPONENTS) {
          for (const [_, conflict] of Object.entries(conflicts)) {
            if (validateComponentsDifference(conflict[1])) {
              conflict[1] = conflict[1].map((c: string) => Object.keys(c)[0]);
              showConflicts(green(group) + ' => ' + key, [conflict]);
              potentialConflictsTotal += 1;
            }
          }
        } else {
          if (withoutXTagGroups && group === 'tags') {
            duplicateTagDescriptionWarning(conflicts);
          } else {
            potentialConflictsTotal += conflicts.length;
            showConflicts(green(group) + ' => ' + key, conflicts);
          }
        }

        if (group === 'tags' && !withoutXTagGroups) {
          prefixTagSuggestion(conflicts.length);
        }
      }
    }
  }

  return potentialConflictsTotal;
}

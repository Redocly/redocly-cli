import type { Oas3Tag, Oas3_2Tag } from '@redocly/openapi-core';

import type { JoinDocumentContext } from '../types.js';
import { addComponentsPrefix } from './add-components-prefix.js';
import { addPrefix } from './add-prefix.js';

const Tags = 'tags';
const xTagGroups = 'x-tagGroups';

export function populateTags({
  joinedDef,
  withoutXTagGroups,
  context,
}: {
  joinedDef: any;
  withoutXTagGroups: boolean | undefined;
  context: JoinDocumentContext;
}) {
  const {
    api,
    apiFilename,
    apiTitle,
    tags,
    potentialConflicts,
    tagsPrefix,
    componentsPrefix,
    oasVersion,
  } = context;
  if (!joinedDef.hasOwnProperty(Tags)) {
    joinedDef[Tags] = [];
  }
  if (!potentialConflicts.tags.hasOwnProperty('all')) {
    potentialConflicts.tags['all'] = {};
  }
  if (withoutXTagGroups && !potentialConflicts.tags.hasOwnProperty('description')) {
    potentialConflicts.tags['description'] = {};
  }
  for (const tag of tags || []) {
    const entrypointTagName = addPrefix(tag.name, tagsPrefix);
    if (tag.description) {
      tag.description = addComponentsPrefix(tag.description, componentsPrefix!);
    }

    const tagDuplicate = joinedDef.tags.find(
      (t: Oas3Tag | Oas3_2Tag) => t.name === entrypointTagName
    );

    if (tagDuplicate && withoutXTagGroups) {
      // If tag already exist and `without-x-tag-groups` option,
      // check if description are different for potential conflicts warning.
      const isTagDescriptionNotEqual =
        tag.hasOwnProperty('description') && tagDuplicate.description !== tag.description;

      potentialConflicts.tags.description[entrypointTagName].push(
        ...(isTagDescriptionNotEqual ? [api] : [])
      );
    } else if (!tagDuplicate) {
      if (oasVersion === 'oas3_0' || oasVersion === 'oas3_1') {
        (tag as Oas3Tag)['x-displayName'] = (tag as Oas3Tag)['x-displayName'] || tag.name;
      } else if (oasVersion === 'oas3_2') {
        (tag as Oas3_2Tag).summary = (tag as Oas3_2Tag).summary || tag.name;
      }
      tag.name = entrypointTagName;
      joinedDef.tags.push(tag);

      if (withoutXTagGroups) {
        potentialConflicts.tags.description[entrypointTagName] = [api];
      }
    }

    if (!withoutXTagGroups && oasVersion !== 'oas3_2') {
      const groupName = apiTitle || apiFilename;
      createXTagGroups(joinedDef, groupName);
      if (!tagDuplicate) {
        populateXTagGroups(joinedDef, entrypointTagName, getIndexGroup(joinedDef, groupName));
      }
    }

    const doesEntrypointExist =
      !potentialConflicts.tags.all[entrypointTagName] ||
      (potentialConflicts.tags.all[entrypointTagName] &&
        !potentialConflicts.tags.all[entrypointTagName].includes(api));
    potentialConflicts.tags.all[entrypointTagName] = [
      ...(potentialConflicts.tags.all[entrypointTagName] || []),
      ...(!withoutXTagGroups && doesEntrypointExist ? [api] : []),
    ];
  }
}

function getIndexGroup(joinedDef: any, name: string): number {
  return joinedDef[xTagGroups].findIndex((item: any) => item.name === name);
}

function createXTagGroups(joinedDef: any, name: string) {
  if (!joinedDef.hasOwnProperty(xTagGroups)) {
    joinedDef[xTagGroups] = [];
  }

  if (!joinedDef[xTagGroups].some((g: any) => g.name === name)) {
    joinedDef[xTagGroups].push({ name, tags: [] });
  }

  const indexGroup = getIndexGroup(joinedDef, name);

  if (!joinedDef[xTagGroups][indexGroup].hasOwnProperty(Tags)) {
    joinedDef[xTagGroups][indexGroup][Tags] = [];
  }
}

function populateXTagGroups(joinedDef: any, entrypointTagName: string, indexGroup: number) {
  if (!joinedDef[xTagGroups][indexGroup][Tags].find((t: Oas3Tag) => t.name === entrypointTagName)) {
    joinedDef[xTagGroups][indexGroup][Tags].push(entrypointTagName);
  }
}

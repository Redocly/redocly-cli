import RuleSortMethods from './rule-sort-methods.js';
import RuleSortProps from './rule-sort-props.js';
import SortEnumsAlphabetically from './sort-enums.js';
import SortMethods from './sort-methods.js';
import SortPropertiesAlphabetically from './sort-props-alpha.js';
import SortPropertiesRequiredFirst from './sort-props-required.js';
import SortTagsAlphabetically from './sort-tags.js';

export default function Sorting() {
  return {
    id: 'sorting',
    rules: {
      oas3: {
        'method-sort': RuleSortMethods,
        'property-sort': RuleSortProps,
      },
    },
    decorators: {
      oas3: {
        'tags-alphabetical': SortTagsAlphabetically,
        'enums-alphabetical': SortEnumsAlphabetically,
        methods: SortMethods,
        'properties-alphabetical': SortPropertiesAlphabetically,
        'properties-required-first': SortPropertiesRequiredFirst,
      },
    },
  };
}

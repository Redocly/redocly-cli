import RuleSortMethods from './rule-sort-methods';
import RuleSortProps from './rule-sort-props';
import SortEnumsAlphabetically from './sort-enums';
import SortMethods from './sort-methods';
import SortPropertiesAlphabetically from './sort-props-alpha';
import SortPropertiesRequiredFirst from './sort-props-required';
import SortTagsAlphabetically from './sort-tags';

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

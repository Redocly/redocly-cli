import { sortMethods } from '../sort.js';

describe('sortMethods', () => {
  it('should sort methods', () => {
    expect(['post', 'put', 'get', 'patch', 'delete'].sort(sortMethods)).toEqual([
      'post',
      'put',
      'get',
      'patch',
      'delete',
    ]);
  });
});

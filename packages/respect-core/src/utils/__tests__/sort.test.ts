import { sortMethods } from '../sort';

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

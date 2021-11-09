import path = require('path');

import { bundle } from '../../bundle'
import { Config } from '../../config/config';

import { yamlSerializer } from '../../../__tests__/utils';

import { makeConfig } from './config';

describe('oas3 hide-internals', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  // FIXME: this test produces incorrect snapshot.
  // Please check why 'hide-internals' decorator is not called with `openapi bundle` command
  it('removes internal paths', async () => {
    const { bundle: res } = await bundle({
      config: new Config(
        { lint: makeConfig({}, { 'hide-internals': 'on' }) },
        path.join(__dirname, 'fixtures/hide-internals/.redocly.yaml')
      ),
      ref: path.join(__dirname, 'fixtures/hide-internals/internal-path.yaml')
    });

    expect(res.parsed).toMatchSnapshot();
  })
});

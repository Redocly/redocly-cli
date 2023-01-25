import { handleJoin } from '../../commands/join';
import { exitWithError, writeYaml } from '../../utils';
import { yellow } from 'colorette';
import { detectOpenAPI } from '@redocly/openapi-core';

jest.mock('../../utils');
jest.mock('colorette');

describe('handleJoin fails', () => {
  const colloreteYellowMock = yellow as jest.Mock<any, any>;
  colloreteYellowMock.mockImplementation((string: string) => string);

  it('should call exitWithError because only one entrypoint', async () => {
    await handleJoin({ apis: ['first.yaml'] }, 'cli-version');
    expect(exitWithError).toHaveBeenCalledWith(`At least 2 apis should be provided. \n\n`);
  });

  it('should call exitWithError because passed all 3 options for tags', async () => {
    await handleJoin(
      {
        apis: ['first.yaml', 'second.yaml'],
        'prefix-tags-with-info-prop': 'something',
        'without-x-tag-groups': true,
        'prefix-tags-with-filename': true,
      },
      'cli-version'
    );

    expect(exitWithError).toHaveBeenCalledWith(
      `You use prefix-tags-with-filename, prefix-tags-with-info-prop, without-x-tag-groups together.\nPlease choose only one! \n\n`
    );
  });

  it('should call exitWithError because passed all 2 options for tags', async () => {
    await handleJoin(
      {
        apis: ['first.yaml', 'second.yaml'],
        'without-x-tag-groups': true,
        'prefix-tags-with-filename': true,
      },
      'cli-version'
    );

    expect(exitWithError).toHaveBeenCalledWith(
      `You use prefix-tags-with-filename, without-x-tag-groups together.\nPlease choose only one! \n\n`
    );
  });

  it('should call exitWithError because Only OpenAPI 3 is supported', async () => {
    await handleJoin(
      {
        apis: ['first.yaml', 'second.yaml'],
      },
      'cli-version'
    );
    expect(exitWithError).toHaveBeenCalledWith('Only OpenAPI 3 is supported: undefined \n\n');
  });

  it('should call writeYaml function', async () => {
    (detectOpenAPI as jest.Mock).mockReturnValue('oas3_0');
    await handleJoin(
      {
        apis: ['first.yaml', 'second.yaml'],
      },
      'cli-version'
    );

    expect(writeYaml).toHaveBeenCalledWith(expect.any(Object), 'openapi.yaml', expect.any(Boolean));
  });

  it('should call writeYaml function with custom output file', async () => {
    (detectOpenAPI as jest.Mock).mockReturnValue('oas3_0');
    await handleJoin(
      {
        apis: ['first.yaml', 'second.yaml'],
        output: 'output.yml',
      },
      'cli-version'
    );

    expect(writeYaml).toHaveBeenCalledWith(expect.any(Object), 'output.yml', expect.any(Boolean));
  });
});

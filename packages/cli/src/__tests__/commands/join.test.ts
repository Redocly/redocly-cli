import { handleJoin }   from '../../commands/join';
import { exitWithError } from '../../utils';
import { yellow } from 'colorette';

jest.mock('../../utils');
jest.mock('colorette');

describe('handleJoin fails', () => {

    const colloreteYellowMock = (yellow as jest.Mock<any,any>);
    colloreteYellowMock.mockImplementation((string:string)=> string);

    it('should call exitWithError because only one entrypoint', async () => {
        await handleJoin({ entrypoints: ['first.yaml'] },'cli-version');
        expect(exitWithError).toHaveBeenCalledWith(`At least 2 entrypoints should be provided. \n\n`);
    });

    it('should call exitWithError because passed all 3 options for tags', async () => {
        await handleJoin({
            entrypoints: ['first.yaml', 'second.yaml'], 
            'prefix-components-with-info-prop': 'something',
            'skip-tags-check': true,
            'prefix-tags-with-filename': true
        }, 'cli-version')

        expect(exitWithError).toHaveBeenCalledWith(
            `You use prefix-tags-with-filename,prefix-tags-with-info-prop or skip-tags-check together.\nPlease choose only one! \n\n`,
        );
    })

    it('should call exitWithError because passed all 2 options for tags', async () => {
        await handleJoin({
            entrypoints: ['first.yaml', 'second.yaml'], 
            'skip-tags-check': true,
            'prefix-tags-with-filename': true
        }, 'cli-version');

        expect(exitWithError).toHaveBeenCalledWith(
            `You use prefix-tags-with-filename,prefix-tags-with-info-prop or skip-tags-check together.\nPlease choose only one! \n\n`,
        );
    })
});
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { notifyUpdateCliVersion} from '../update-version-notifier';

jest.mock('node-fetch');

describe('notifyUpdateCliVersion', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
        jest.spyOn(os, 'tmpdir').mockReturnValue('/tmp');
        jest.spyOn(path, 'join').mockReturnValue('/tmp/redocly-cli-check-version');
        jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(new Date().getTime().toString());
    });


    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should not notify if not needs to be checked', async () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        await notifyUpdateCliVersion();
        expect(mockFetch).not.toBeCalled();
    });

    it('should notify if a new version is available', async () => {
        jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2023-05-22T00:00:00.000Z').getTime());
        jest.spyOn(process.stderr, 'write').mockImplementation();

        mockFetch.mockResolvedValue({
            json: jest.fn().mockResolvedValue({
                version: '1.0.0',
            }),
        } as any);


        await notifyUpdateCliVersion();

        expect(mockFetch).toBeCalledWith('http://registry.npmjs.org/@redocly/cli/latest');
        expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should handle error when fetching latest version', async () => {
        jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2023-05-22T00:00:00.000Z').getTime());
        jest.spyOn(process.stderr, 'write').mockImplementation();

        mockFetch.mockRejectedValue(new Error());

        await notifyUpdateCliVersion();

        expect(mockFetch).toBeCalledWith('http://registry.npmjs.org/@redocly/cli/latest');
        expect(process.stderr.write).not.toHaveBeenCalled();
    });
});
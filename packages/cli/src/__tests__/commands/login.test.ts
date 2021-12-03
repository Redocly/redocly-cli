import { RedoclyClient } from '@redocly/openapi-core';

jest.unmock('@redocly/openapi-core');

describe('login', () => {
	it('should call login with setAccessTokens function', async () => {
		const client = new RedoclyClient();
		Object.defineProperty(client, 'registryApi', {
			value: {
				setAccessTokens: jest.fn(),
				authStatus: jest.fn(() => true)
			},
			writable: true,
			configurable: true
		});
		await client.login('token');
		expect(client.registryApi.setAccessTokens).toHaveBeenCalled();
	});
});

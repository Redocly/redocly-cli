import { Dispatcher } from 'undici';
import * as http from 'http';

import { getAgent } from '../../../../../commands/respect/har-logs/helpers/get-agent.js';

describe('getAgent', () => {
  it('should return an agent', () => {
    const input = 'https://example.com';
    const agent = getAgent(input, { har: {} });
    expect(agent).toBeDefined();
  });

  it('should return an agent with a dispatcher', () => {
    const input = 'https://example.com';
    const agent = getAgent(input, { har: {}, dispatcher: new Dispatcher() });
    expect(agent).toBeDefined();
  });

  it('should return an agent with a custom agent', () => {
    const input = 'https://example.com';
    const agent = getAgent(input, { har: {}, agent: new http.Agent() });
    expect(agent).toBeDefined();
  });

  it('should return an agent with a custom agent function', () => {
    const input = 'https://example.com';
    const agent = getAgent(input, { har: {}, agent: () => new http.Agent() });
    expect(agent).toBeDefined();
  });

  it('should return an agent with a custom dispatcher', () => {
    const input = 'https://example.com';
    const agent = getAgent(input, { har: {}, dispatcher: new Dispatcher() });
    expect(agent).toBeDefined();
  });

  it('should return an agent with a custom agent and dispatcher', () => {
    const input = 'https://example.com';
    const agent = getAgent(input, {
      har: {},
      agent: new http.Agent(),
      dispatcher: new Dispatcher(),
    });
    expect(agent).toBeDefined();
  });

  it('should throw error for invalid URL', () => {
    const input = 'not-a-valid-url';
    expect(() => getAgent(input, { har: {} })).toThrow('Invalid URL');
  });

  it('should handle http protocol', () => {
    const input = 'http://example.com';
    const agent = getAgent(input, { har: {} });
    expect(agent).toBeDefined();
    expect(agent.protocol).toBe('http:');
  });

  it('should handle https protocol', () => {
    const input = 'https://example.com';
    const agent = getAgent(input, { har: {} });
    expect(agent).toBeDefined();
    expect(agent.protocol).toBe('https:');
  });

  it('should handle agent function with protocol', () => {
    const input = 'https://example.com';
    const agentFn = () => new http.Agent();
    const agent = getAgent(input, { har: {}, agent: agentFn });
    expect(agent).toBeDefined();
  });

  it('should handle undefined agent and dispatcher', () => {
    const input = 'https://example.com';
    const agent = getAgent(input, { har: {} });
    expect(agent).toBeDefined();
    expect(agent).toBeInstanceOf(http.Agent);
  });

  it('should handle dispatcher function', () => {
    const input = 'https://example.com';
    const dispatcherFn = () => new Dispatcher();
    const agent = getAgent(input, { har: {}, dispatcher: dispatcherFn });
    expect(agent).toBeDefined();
    expect(agent).toBeInstanceOf(Function);
  });

  it('should handle agent instance without protocol check', () => {
    const input = 'https://example.com';
    const customAgent = new http.Agent();
    const agent = getAgent(input, { har: {}, agent: customAgent });
    expect(agent).toBe(customAgent);
  });
});

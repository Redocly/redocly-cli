import { compileOpenApiPath } from '../../../commands/drift/utils/http.js';

describe('compileOpenApiPath', () => {
  it('compiles a segment that is a single parameter', () => {
    const { regex, params } = compileOpenApiPath('/users/{userId}');

    expect(params).toEqual(['userId']);
    expect(regex.exec('/users/usr_abc')?.[1]).toBe('usr_abc');
  });

  it('does not let a parameter span a path separator', () => {
    const { regex } = compileOpenApiPath('/users/{userId}');

    expect(regex.exec('/users/usr_abc/friends')).toBeNull();
  });

  it('compiles two parameters separated by a literal inside one segment', () => {
    const { regex, params } = compileOpenApiPath('/instances/{worldId}:{instanceId}');

    expect(params).toEqual(['worldId', 'instanceId']);

    const match = regex.exec(
      '/instances/wrld_a:85981~group(grp_b)~groupAccessType(public)~region(us)'
    );
    expect(match?.[1]).toBe('wrld_a');
    expect(match?.[2]).toBe('85981~group(grp_b)~groupAccessType(public)~region(us)');
  });

  it('splits on the first separator when the trailing value holds another', () => {
    const { regex } = compileOpenApiPath('/instances/{worldId}:{instanceId}');
    const match = regex.exec('/instances/wrld_a:12345~region(us):extra');

    expect(match?.[1]).toBe('wrld_a');
    expect(match?.[2]).toBe('12345~region(us):extra');
  });

  it('keeps matching a multi-parameter segment when a suffix segment follows', () => {
    const { regex } = compileOpenApiPath('/instances/{worldId}:{instanceId}/shortName');

    expect(regex.exec('/instances/wrld_a:123~private(usr_b)/shortName')?.[2]).toBe(
      '123~private(usr_b)'
    );
  });

  it('ranks a partially literal segment above a bare parameter', () => {
    expect(compileOpenApiPath('/instances/{worldId}:{instanceId}').score).toBeGreaterThan(
      compileOpenApiPath('/instances/{instanceId}').score
    );
  });

  it('treats a segment with no parameters as a literal', () => {
    const { regex, params } = compileOpenApiPath('/instances/recent');

    expect(params).toEqual([]);
    expect(regex.exec('/instances/anything')).toBeNull();
    expect(regex.exec('/instances/recent')).not.toBeNull();
  });
});

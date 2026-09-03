import { compileOpenApiPath } from '../utils/http.js';

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

  it('gives the first of two adjacent parameters a single character', () => {
    const { regex, params } = compileOpenApiPath('/tiles/{zoom}{coordinates}');

    expect(params).toEqual(['zoom', 'coordinates']);

    const match = regex.exec('/tiles/4abcd');
    expect(match?.[1]).toBe('4');
    expect(match?.[2]).toBe('abcd');
  });

  it('splits a segment on a multi-character separator', () => {
    const { regex, params } = compileOpenApiPath('/builds/{project}--{revision}');

    expect(params).toEqual(['project', 'revision']);

    const match = regex.exec('/builds/site--a--b');
    expect(match?.[1]).toBe('site');
    expect(match?.[2]).toBe('a--b');
  });

  it('lets a parameter before a trailing literal contain the literal separator char', () => {
    const { regex } = compileOpenApiPath('/files/{name}.json');

    expect(regex.exec('/files/report.v1.json')?.[1]).toBe('report.v1');
  });

  it('rejects a long non-matching value without backtracking blow-up', () => {
    const { regex } = compileOpenApiPath('/v1/{a}:{b}:{c}.json');
    const longPath = '/v1/' + 'a:'.repeat(2500) + 'a';

    const startedAt = performance.now();
    expect(regex.exec(longPath)).toBeNull();
    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it('treats a segment with no parameters as a literal', () => {
    const { regex, params } = compileOpenApiPath('/instances/recent');

    expect(params).toEqual([]);
    expect(regex.exec('/instances/anything')).toBeNull();
    expect(regex.exec('/instances/recent')).not.toBeNull();
  });
});

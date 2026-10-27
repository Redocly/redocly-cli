import { JAVA_RUNTIME_SOURCE } from '../java.js';

describe('JAVA_RUNTIME_SOURCE (the embedded Java runtime)', () => {
  // The generator slices the class body out of this source, so the class line and the
  // declarations the generated methods call must keep their spelling.
  it('embeds the load-bearing declarations', () => {
    for (const declaration of [
      'abstract class Runtime {',
      'public static class ApiException extends RuntimeException',
      'public static class ApiTimeoutException extends RuntimeException',
      'public static final class Config',
      'public static final class Json',
      'static ResolvedAuth resolveAuth(',
      'static String buildUrl(',
      'static HttpResponse<InputStream> send(Config config, RequestSpec spec)',
      'static Iterable<Object> iterPages(',
      'static Iterable<ServerSentEvent> iterSse(',
      'static Body toMultipart(',
      'static Body multipartBody(',
      'static Body binaryBody(',
      'static Body jsonBody(',
      'Idempotency-Key',
      'Retry-After',
      'Last-Event-ID',
    ]) {
      expect(JAVA_RUNTIME_SOURCE).toContain(declaration);
    }
  });
});

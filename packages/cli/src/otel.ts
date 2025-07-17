import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { version } from './utils/package.js';
import { DEFAULT_FETCH_TIMEOUT } from './utils/fetch-with-timeout.js';

import type { Analytics } from './utils/telemetry.js';

type Events = {
  [key: string]: Analytics;
};

const OTEL_TRACES_URL = process.env.OTEL_TRACES_URL || 'https://otel.cloud.redocly.com/v1/traces';

export class OtelServerTelemetry {
  async send<K extends keyof Events>(event: K, data: Events[K]): Promise<void> {
    const nodeTracerProvider = new NodeTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: `redocly-cli`,
        [ATTR_SERVICE_VERSION]: `@redocly/cli@${version}`,
      }),
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: OTEL_TRACES_URL,
            headers: {},
            timeoutMillis: DEFAULT_FETCH_TIMEOUT,
          })
        ),
      ],
    });

    const time = new Date();
    const eventId = crypto.randomUUID();
    const tracer = nodeTracerProvider.getTracer('CliTelemetry');
    const span = tracer.startSpan(`event.${event}`, {
      attributes: {
        'cloudevents.event_client.id': eventId,
        'cloudevents.event_client.type': event,
      },
      startTime: time,
    });

    for (const [key, value] of Object.entries(data)) {
      const keySnakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (value !== undefined) {
        span.setAttribute(`cloudevents.event_data.${keySnakeCase}`, value);
      }
    }

    span.end(time);

    try {
      await nodeTracerProvider.forceFlush();
    } catch (error) {
      process.exit(3); // Exit with error code 3 to indicate telemetry failure
    }
  }
}

export const otelTelemetry = new OtelServerTelemetry();

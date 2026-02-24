import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import type { CloudEvents } from '@redocly/cli-otel';
import { ulid } from 'ulid';

import { OTEL_TRACES_URL, DEFAULT_FETCH_TIMEOUT } from './constants.js';
import { processCloudEventAttributes } from './otel-attributes.js';
import { version } from './package.js';

export class OtelServerTelemetry {
  private nodeTracerProvider: NodeTracerProvider;

  constructor() {
    this.nodeTracerProvider = new NodeTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: `redocly-cli`,
        [ATTR_SERVICE_VERSION]: `@redocly/cli@${version}`,
        session_id: `ses_${ulid()}`,
      }),
      spanProcessors: [
        new SimpleSpanProcessor(
          new OTLPTraceExporter({
            url: OTEL_TRACES_URL,
            headers: {},
            timeoutMillis: DEFAULT_FETCH_TIMEOUT,
          })
        ),
      ],
    });
  }

  send(cloudEvent: CloudEvents.cloudEvents.CloudEventMapperResult): void {
    const time = cloudEvent.time ? new Date(cloudEvent.time) : new Date();
    const tracer = this.nodeTracerProvider.getTracer('CliTelemetry');

    const spanName = `event.${cloudEvent.type}`;
    const attributes = processCloudEventAttributes(cloudEvent, time);

    const span = tracer.startSpan(spanName, {
      attributes,
      startTime: time,
    });

    span.end(time);
  }
}

export const otelTelemetry = new OtelServerTelemetry();

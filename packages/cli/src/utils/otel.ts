import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { version } from './package.js';
import { OTEL_TRACES_URL, DEFAULT_FETCH_TIMEOUT } from './constants.js';
import { isDefined } from '../../../core/src/utils/is-defined.js';

import type { CloudEvents } from '@redocly/cli-opentelemetry';

type CloudEvent = CloudEvents.Messages;

export class OtelServerTelemetry {
  private nodeTracerProvider: NodeTracerProvider;

  constructor() {
    this.nodeTracerProvider = new NodeTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: `redocly-cli`,
        [ATTR_SERVICE_VERSION]: `@redocly/cli@${version}`,
        session_id: `ses_${crypto.randomUUID()}`,
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

  send(cloudEvent: CloudEvent): void {
    const time = cloudEvent.time ? new Date(cloudEvent.time) : new Date();
    const tracer = this.nodeTracerProvider.getTracer('CliTelemetry');
    const spanName = `event.${cloudEvent.data.command}`;

    const attributes: Record<string, string | number | boolean> = {
      'cloudevents.event_id': cloudEvent.id,
      'cloudevents.event_type': cloudEvent.type,
      'cloudevents.event_source': cloudEvent.source,
      'cloudevents.event_spec_version': cloudEvent.specversion,
      'cloudevents.event_data_content_type': cloudEvent.datacontenttype,
      'cloudevents.event_time': time.toISOString(),
      'cloudevents.event_origin': cloudEvent.origin,
      'cloudevents.event_source_details.user_id': cloudEvent.sourceDetails?.user_id ?? 'anonymous',
    };

    for (const [key, value] of Object.entries(cloudEvent.data)) {
      const keySnakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (isDefined(value)) {
        attributes[`cloudevents.event_data.${keySnakeCase}`] = value;
      }
    }

    const span = tracer.startSpan(spanName, {
      attributes,
      startTime: time,
    });

    span.end(time);
  }
}

export const otelTelemetry = new OtelServerTelemetry();

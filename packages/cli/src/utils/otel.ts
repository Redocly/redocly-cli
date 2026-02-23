import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import type { CloudEvents } from '@redocly/cli-otel';
import { ulid } from 'ulid';

import { OTEL_TRACES_URL, DEFAULT_FETCH_TIMEOUT } from './constants.js';
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

  send(cloudEvent: CloudEvents.Messages): void {
    const time = cloudEvent.time ? new Date(cloudEvent.time) : new Date();
    const tracer = this.nodeTracerProvider.getTracer('CliTelemetry');
    // @ts-ignore
    const spanName = `event.${cloudEvent.data.command?.command}`;

    const attributes: Record<string, string | number | boolean | undefined> = {
      'cloudevents.event_id': cloudEvent.id,
      'cloudevents.event_type': cloudEvent.type,
      'cloudevents.event_source': cloudEvent.source,
      'cloudevents.event_spec_version': cloudEvent.specversion,
      'cloudevents.category': 'product',
      'cloudevents.signal': 'log',
      'cloudevents.event_data_content_type':
        cloudEvent.datacontenttype || 'application/json; charset=utf-8',
      'cloudevents.event_time': time.toISOString(),
      'cloudevents.event_version': '1.0.0',
      'cloudevents.origin': cloudEvent.origin,
      'cloudevents.project.id': '',
      'cloudevents.project.slug': '',
      'cloudevents.organization.id': '',
      'cloudevents.organization.slug': '',
      'cloudevents.event_origin': cloudEvent.productType,
      'cloudevents.actor.id': cloudEvent.sourceDetails?.id ?? `ann_${ulid()}`,
      'cloudevents.actor.object': cloudEvent.sourceDetails?.object ?? 'anonymous',
      'cloudevents.actor.uri': cloudEvent.sourceDetails?.uri ?? '',
      'cloudevents.event_source_details.id': cloudEvent.sourceDetails?.id ?? `ann_${ulid()}`,
      'cloudevents.event_source_details.object': cloudEvent.sourceDetails?.object ?? 'anonymous',
      'cloudevents.event_source_details.uri': cloudEvent.sourceDetails?.uri ?? '',
      'cloudevents.osPlatform': cloudEvent.os_platform,
      'cloudevents.env': cloudEvent.environment,
    };

    for (const [key, value] of Object.entries(cloudEvent.data.command)) {
      const keySnakeCase = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (value !== undefined) {
        attributes[`cloudevents.event_data.command.${keySnakeCase}`] = value;
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

import type { Attributes } from '@opentelemetry/api';
import type { CloudEvents } from '@redocly/cli-otel';

type CloudEventMapperResult = CloudEvents.cloudEvents.CloudEventMapperResult;
type CloudEventBaseAttributes = Record<string, string | number | undefined>;
type OtelClientConfig = {
  version?: string;
  serviceName?: string;
};

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function flattenToAttributes(
  data: Record<string, unknown>,
  prefix: string,
  attributes: Attributes,
  useSnakeCase = true
): void {
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const formattedKey = useSnakeCase ? toSnakeCase(key) : key;
      attributes[`${prefix}${formattedKey}`] = value as string;
    }
  }
}

function buildBaseAttributes(
  cloudEvent: CloudEventMapperResult,
  time: Date,
  config?: OtelClientConfig | null
): CloudEventBaseAttributes {
  const timeStr = time instanceof Date ? time.toISOString() : new Date(time).toISOString();
  return {
    'cloudevents.event_id': cloudEvent.id,
    'cloudevents.event_type': cloudEvent.type,
    'cloudevents.event_source': cloudEvent.source ?? undefined,
    'cloudevents.event_spec_version': cloudEvent.specversion,
    'cloudevents.event_data_content_type':
      cloudEvent.datacontenttype ?? 'application/json; charset=utf-8',
    'cloudevents.event_time': timeStr,
    'cloudevents.event_subject': cloudEvent.subject ?? '',
    'cloudevents.page.uri': typeof location !== 'undefined' ? location.href : undefined,
    'cloudevents.event_version': config?.version,
    'cloudevents.event_origin': cloudEvent.origin ?? config?.serviceName,
    'cloudevents.metadata.user_id': cloudEvent.analyticsMetadata?.userId,
    'cloudevents.metadata.user_ip_address': cloudEvent.analyticsMetadata?.userIpAddress,
    'cloudevents.event_object': cloudEvent.object || 'event',
    'cloudevents.object': cloudEvent.object || 'event',
    'cloudevents.event_category': cloudEvent.category,
    'cloudevents.event_signal': cloudEvent.signal,
    'cloudevents.origin': cloudEvent.origin,
    'cloudevents.event_actor.id': cloudEvent.actor?.id ?? undefined,
    'cloudevents.event_actor.object': cloudEvent.actor?.object ?? undefined,
    'cloudevents.event_actor.uri': cloudEvent.actor?.uri ?? undefined,
    'cloudevents.event_os_platform': cloudEvent.osPlatform,
    'cloudevents.event_user_agent': cloudEvent.userAgent,
  };
}

export function processCloudEventAttributes(
  cloudEvent: CloudEventMapperResult,
  time: Date,
  config?: OtelClientConfig | null
): Attributes {
  const attributes: Attributes = {
    ...buildBaseAttributes(cloudEvent, time, config),
  };

  processEventData(cloudEvent.data, attributes);
  processSubjects(cloudEvent, attributes);

  return attributes;
}

function processEventData(eventData: unknown, attributes: Attributes): void {
  if (!eventData || typeof eventData !== 'object' || Array.isArray(eventData)) {
    return;
  }

  const data = eventData as Record<string, unknown>;
  const objectType = typeof data.object === 'string' ? data.object : undefined;
  const prefix = `cloudevents.event_data.${objectType ? `${objectType}.` : ''}`;

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      attributes[`${prefix}${toSnakeCase(key)}`] = value;
    }
  }
}

function processSubjects(event: CloudEventMapperResult, attributes: Attributes): void {
  if (!event.subjects || !Array.isArray(event.subjects)) {
    return;
  }

  for (const subject of event.subjects) {
    if (!subject || typeof subject.object !== 'string') {
      continue;
    }
    flattenToAttributes(
      subject as unknown as Record<string, unknown>,
      `cloudevents.subjects.${subject.object}.`,
      attributes,
      false
    );
  }
}

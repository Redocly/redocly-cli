import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSpanEnd, mockStartSpan, mockGetTracer, mockProcessCloudEventAttributes } = vi.hoisted(
  () => {
    const mockSpanEnd = vi.fn();
    const mockStartSpan = vi.fn();
    const mockGetTracer = vi.fn();
    const mockProcessCloudEventAttributes = vi.fn();

    return { mockSpanEnd, mockStartSpan, mockGetTracer, mockProcessCloudEventAttributes };
  }
);

vi.mock('@redocly/cli-otel', () => ({
  processCloudEventAttributes: mockProcessCloudEventAttributes,
}));

vi.mock('@opentelemetry/sdk-trace-node', () => ({
  NodeTracerProvider: class {
    getTracer(...args: any[]) {
      return mockGetTracer(...args);
    }
  },
  SimpleSpanProcessor: class {},
}));

import type { CloudEvents } from '@redocly/cli-otel';

import { OtelServerTelemetry } from '../otel.js';

const TEST_EVENT: CloudEvents.CloudEventMapperResult = {
  id: 'evt_test_001',
  specversion: '1.0',
  object: 'event',
  datacontenttype: 'application/json',
  type: 'com.redocly.command.ran',
  time: '2025-01-15T10:30:00.000Z',
  origin: 'redocly-cli',
  source: 'com.redocly.cli',
  category: 'product',
  actor: { id: 'ann_01JTESTID', object: 'user', uri: '' },
  data: [
    {
      id: 'cli-command-run',
      object: 'command',
      uri: 'urn:redocly:cli',
      command: 'lint',
      exit_code: 0,
      execution_time: 1500,
    },
  ],
};

describe('OtelServerTelemetry.send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpanEnd.mockReturnValue(undefined);
    mockStartSpan.mockReturnValue({ end: mockSpanEnd });
    mockGetTracer.mockReturnValue({ startSpan: mockStartSpan });
    mockProcessCloudEventAttributes.mockReturnValue({
      'cloudevents.event_id': 'evt_test_001',
    });
  });

  it('should process cloud event into OTEL span', () => {
    const attrs = {
      'cloudevents.event_id': 'evt_test_001',
      'cloudevents.event_type': 'com.redocly.command.ran',
    };
    mockProcessCloudEventAttributes.mockReturnValue(attrs);

    const telemetry = new OtelServerTelemetry();
    telemetry.send(TEST_EVENT);

    const expectedTime = new Date('2025-01-15T10:30:00.000Z');
    expect(mockProcessCloudEventAttributes).toHaveBeenCalledWith(TEST_EVENT, expectedTime);
    expect(mockStartSpan).toHaveBeenCalledWith('event.com.redocly.command.ran', {
      attributes: attrs,
      startTime: expectedTime,
    });
    expect(mockSpanEnd).toHaveBeenCalledWith(expectedTime);
  });
});

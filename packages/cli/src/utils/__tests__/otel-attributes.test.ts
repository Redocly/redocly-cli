import type { CloudEvents } from '@redocly/cli-otel';

import { processCloudEventAttributes } from '../otel-attributes.js';

const TEST_EVENT: CloudEvents.cloudEvents.CloudEventMapperResult = {
  id: 'evt_001',
  type: 'com.example.action',
  specversion: '1.0',
  datacontenttype: 'application/json',
  source: 'com.example',
  origin: 'example-service',
  object: 'event',
  osPlatform: 'linux',
  time: '2024-01-01T00:00:00.000Z',
  actor: { id: 'ann_001', object: 'user', uri: '' },
  subjects: [{ id: 'sub_001', object: 'action.performed', uri: '' }],
  data: {
    object: 'action',
    name: 'do-something',
    exit_code: 0,
    version: '1.0.0',
  },
};

const TEST_TIME = new Date('2024-01-01T00:00:00.000Z');

describe('processCloudEventAttributes', () => {
  it('maps CloudEvent fields to OTEL attributes', () => {
    const attrs = processCloudEventAttributes(TEST_EVENT, TEST_TIME);

    expect(attrs).toMatchObject({
      'cloudevents.event_id': 'evt_001',
      'cloudevents.event_type': 'com.example.action',
      'cloudevents.event_source': 'com.example',
      'cloudevents.event_time': TEST_TIME.toISOString(),
      'cloudevents.event_actor.id': 'ann_001',
      'cloudevents.event_os_platform': 'linux',
      'cloudevents.event_data.action.object': 'action',
      'cloudevents.event_data.action.name': 'do-something',
      'cloudevents.event_data.action.exit_code': 0,
      'cloudevents.event_data.action.version': '1.0.0',
      'cloudevents.subjects.action.performed.id': 'sub_001',
      'cloudevents.subjects.action.performed.object': 'action.performed',
    });
  });
});

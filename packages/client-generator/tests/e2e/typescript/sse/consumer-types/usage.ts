import { streamMessages, configure } from './client.js';

// ServerSentEvent<Message>.data.text is typed, and SseOptions accepts reconnect options.
async function check() {
  for await (const event of streamMessages()) {
    const text: string = event.data.text;
    void text;
    const id: string | undefined = event.id;
    void id;
  }
  const stream = streamMessages({}, { reconnect: false, reconnectDelay: 500 });
  void stream;
}
void check;
void configure;
